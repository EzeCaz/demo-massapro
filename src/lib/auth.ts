import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

/**
 * Check if a role has admin-level access (super_admin or admin)
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'super_admin' || role === 'admin'
}

/**
 * Check if a role is the super admin
 */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === 'super_admin'
}

export const authOptions: NextAuthOptions = {
  // Trust the proxy headers (x-forwarded-host, x-forwarded-proto) so that
  // NextAuth correctly identifies the host and protocol in preview/Vercel environments.
  trustHost: true,

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company,
        }
      },
    }),

    // Google OAuth provider — only enabled if env vars are present
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: 'consent',
                access_type: 'offline',
                response_type: 'code',
              },
            },
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    // Max age of session - 30 days
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    /**
     * SignIn callback — for Google OAuth, automatically create or link the user
     * in the database on first sign-in. This avoids the "no account found" error
     * and mirrors typical SaaS onboarding flows.
     */
    async signIn({ user, account }) {
      // Only handle Google (OAuth) sign-ins; credentials provider is handled by authorize()
      if (account?.provider === 'google' && user?.email) {
        try {
          // Try to find an existing user by email
          let dbUser = await db.user.findUnique({
            where: { email: user.email },
          })

          // If the user doesn't exist yet, create one with default 'user' role.
          // The first Google user to sign in does NOT automatically become admin —
          // an existing super_admin must promote them via the admin panel.
          if (!dbUser) {
            dbUser = await db.user.create({
              data: {
                email: user.email,
                name: user.name || null,
                role: 'user',
                // passwordHash stays null — Google users can't sign in via credentials
              },
            })
            console.log(`[Auth] Created new Google user: ${user.email}`)
          }

          // Attach the database fields onto the user object so the jwt callback
          // picks them up (role, company, id).
          const userRecord = user as unknown as Record<string, unknown>
          userRecord.role = dbUser.role
          userRecord.company = dbUser.company
          userRecord.id = dbUser.id
        } catch (err) {
          console.error('[Auth] Google sign-in DB error:', err)
          // Return a string error so NextAuth surfaces it as ?error=OAuthAccountNotLinked
          // or a generic error code — the login page will display a friendly message.
          // Returning `false` would silently redirect to /login?error=OAuthCallback
          // which the user can't easily distinguish from a real OAuth failure.
          throw new Error('Google sign-in failed at the database level. Please try again.')
        }
      }
      return true
    },

    async jwt({ token, user }) {
      // Only set custom properties when user object is available (on sign-in)
      if (user) {
        // Use explicit property assignment to avoid minification issues
        const userData = user as Record<string, unknown>
        token.userRole = userData.role as string
        token.userCompany = userData.company as string
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Transfer custom properties from token to session
        const sessionUser = session.user as Record<string, unknown>
        sessionUser.role = token.userRole
        sessionUser.company = token.userCompany
        sessionUser.id = token.userId
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'massapro-secret-key-change-in-production',
}
