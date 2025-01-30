'use client'

import { signUp } from '@/lib/actions/auth'
import { signUpSchema } from '@/lib/validations'
import AuthForm from '@/components/AuthForm'

const Page = () => (
	<AuthForm
		type='SIGN_UP'
		schema={signUpSchema}
		defaultValues={{
			email: '',
			password: '',
			fullName: '',
			universityId: 0,
			universityCard: '',
		}}
		onSubmit={signUp}
	/>
)

export default Page
