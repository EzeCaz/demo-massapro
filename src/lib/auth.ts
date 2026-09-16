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
        // Magic-link sign-in: the client sends the share token instead of
        // a password. We treat a non-empty `magicToken` as a request to
        // sign in via share token (the email field is then ignored — we
        // trust the email stored on the share row).
        magicToken: { label: 'Magic Token', type: 'text' },
      },
      async authorize(credentials) {
        // ===== Magic-link path =====
        // The user arrived via /s/[token]. We look up the share by token,
        // and if found, sign them in as a virtual "share user" with
        // shareEmail + shareTokenId on the user object. The JWT/session
        // callbacks propagate these so API routes can enforce scope.
        if (credentials?.magicToken) {
          const token = credentials.magicToken.trim()
          const share = await db.integrationSetupShare.findUnique({
            where: { token },
            include: { setup: { select: { id: true, name: true, clientId: true } } },
          })
          if (!share) {
            throw new Error('Invalid or expired link')
          }
          // Return a virtual user object keyed by email. The `id` field is
          // synthetic (not a User row) so we use the share id as a stable
          // identifier — the JWT callback stores `userId = share.id` only
          // for share users, and the integration-setups API recognizes
          // this case via `shareEmail` being non-null.
          return {
            id: `share:${share.id}`,
            email: share.email,
            name: null,
            role: 'share', // sentinel role — has no admin/owner privileges anywhere
            company: null,
            // Custom fields consumed by the jwt callback:
            shareEmail: share.email,
            shareTokenId: share.id,
            shareSetupId: share.setupId,
            shareAccessLevel: share.accessLevel,
          } as any
        }

        // ===== Regular credentials path (unchanged) =====
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

        // Magic-link share sign-in: propagate share-scoping fields so
        // API routes can check whether the session is share-scoped and
        // which setup + access level it grants. The role is 'share' which
        // has no admin/owner privileges anywhere.
        if (userData.role === 'share') {
          token.shareEmail = userData.shareEmail as string
          token.shareSetupId = userData.shareSetupId as string
          token.shareAccessLevel = userData.shareAccessLevel as string
        }
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

        // Share-scoping fields (only present for magic-link users)
        if (token.userRole === 'share') {
          sessionUser.shareEmail = token.shareEmail
          sessionUser.shareSetupId = token.shareSetupId
          sessionUser.shareAccessLevel = token.shareAccessLevel
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'massapro-secret-key-change-in-production',
}
