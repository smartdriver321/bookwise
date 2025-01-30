'use server'

import { hash } from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { signIn } from '@/auth'
import config from '@/lib/config'
import ratelimit from '@/lib/ratelimit'
import { workflowClient } from '@/lib/workflow'
import { db } from '@/database/drizzle'
import { users } from '@/database/schema'

const baseURL =
	config.env.nodeEnv === 'development'
		? config.env.apiEndpoint
		: config.env.prodApiEndpoint

export const signUp = async (params: AuthCredentials) => {
	const { fullName, email, universityId, password, universityCard } = params

	const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1'
	const { success } = await ratelimit.limit(ip)

	if (!success) return redirect('/too-fast')

	const existingUser = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1)

	if (existingUser.length > 0) {
		return { success: false, error: 'User already exists' }
	}

	const hashedPassword = await hash(password, 10)

	try {
		await db.insert(users).values({
			fullName,
			email,
			universityId,
			password: hashedPassword,
			universityCard,
		})

		await workflowClient.trigger({
			url: `${baseURL}/api/workflows/onboarding`,
			body: {
				email,
				fullName,
			},
		})

		await signInWithCredentials({ email, password })

		return { success: true }
	} catch (error) {
		console.log(error, 'Signup error')
		return { success: false, error: 'Signup error' }
	}
}
export const signInWithCredentials = async (
	params: Pick<AuthCredentials, 'email' | 'password'>
) => {
	const { email, password } = params

	const ip = (await headers()).get('x-forwarded-for') || '127.0.0.1'
	const { success } = await ratelimit.limit(ip)

	if (!success) return redirect('/too-fast')

	try {
		const result = await signIn('credentials', {
			email,
			password,
			redirect: false,
		})

		if (result?.error) {
			return { success: false, error: result.error }
		}

		return { success: true }
	} catch (error) {
		console.log(error, 'Signin error')
		return { success: false, error: 'Signin error' }
	}
}
