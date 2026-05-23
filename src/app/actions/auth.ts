'use server'

import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { loginSchema, registerSchema, changePasswordSchema } from '@/lib/schemas'
import { requireSession } from '@/lib/auth-guards'

export type AuthState = {
  errors?: Record<string, string[]>
  message?: string
} | undefined

export async function registerAction(formData: FormData): Promise<void> {
  const result = registerSchema.safeParse({
    labelName: formData.get('labelName'),
    country:   formData.get('country'),
    city:      formData.get('city'),
    genre:     formData.get('genre'),
    firstName: formData.get('firstName'),
    lastName:  formData.get('lastName'),
    email:     formData.get('email'),
    password:  formData.get('password'),
    plan:      formData.get('plan'),
  })

  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date invalide'
    redirect(`/register?error=${encodeURIComponent(msg)}`)
  }

  const { labelName, country, city, genre, firstName, lastName, email, password, plan } = result.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    redirect('/register?error=Email+deja+folosit')
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, firstName, lastName, role: 'LABEL_MANAGER' },
  })

  const label = await prisma.label.create({
    data: { name: labelName, country, city, genre, plan, ownerId: user.id },
  })

  await prisma.user.update({ where: { id: user.id }, data: { labelId: label.id } })
  await createSession(user.id, 'LABEL_MANAGER', label.id)
  redirect('/dashboard')
}

export async function loginAction(formData: FormData): Promise<void> {
  const result = loginSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Date incomplete'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  const { email, password } = result.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { ownedLabel: true, label: true },
  })

  if (!user) redirect('/login?error=Credentiale+incorecte')

  const isValid = await bcrypt.compare(password, user.password)
  if (!isValid) redirect('/login?error=Credentiale+incorecte')

  const labelId = user.ownedLabel?.id || user.labelId || undefined
  await createSession(user.id, user.role, labelId)
  if (user.mustResetPassword) redirect('/change-password')
  if (user.role === 'SUPER_ADMIN') redirect('/admin')
  redirect('/dashboard')
}

export async function changePasswordAction(formData: FormData): Promise<void> {
  const session = await requireSession()

  const result = changePasswordSchema.safeParse({
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? 'Parolă invalidă'
    redirect(`/change-password?error=${encodeURIComponent(msg)}`)
  }

  const hashedPassword = await bcrypt.hash(result.data.newPassword, 10)
  await prisma.user.update({
    where: { id: session.userId },
    data: { password: hashedPassword, mustResetPassword: false },
  })

  redirect('/dashboard')
}

export async function logoutAction() {
  await deleteSession()
  redirect('/')
}
