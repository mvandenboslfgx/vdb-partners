"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerPartner, sendPasswordReset, signIn, type ActionState } from "@/app/actions/auth";
import { Button, Input, Label } from "@/components/ui";

const initialState: ActionState = {};
function Message({ state }: { state: ActionState }) { return state.error ? <p className="mt-4 text-sm text-red-300">{state.error}</p> : state.success ? <p className="mt-4 text-sm text-emerald-300">{state.success}</p> : null; }
export function LoginForm() { const [state, action, pending] = useActionState(signIn, initialState); return <form action={action} className="space-y-4"><div><Label htmlFor="email">E-mailadres</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div><div><Label htmlFor="password">Wachtwoord</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div><Button className="w-full" disabled={pending}>{pending ? "Bezig…" : "Inloggen"}</Button><Message state={state} /><Link className="block text-center text-sm text-gold" href="/forgot-password">Wachtwoord vergeten?</Link></form>; }
export function RegisterForm() { const [state, action, pending] = useActionState(registerPartner, initialState); return <form action={action} className="space-y-4"><div><Label htmlFor="name">Volledige naam</Label><Input id="name" name="name" required /></div><div><Label htmlFor="email">Zakelijk e-mailadres</Label><Input id="email" name="email" type="email" required /></div><div><Label htmlFor="password">Wachtwoord</Label><Input id="password" name="password" type="password" minLength={8} required /></div><Button className="w-full" disabled={pending}>{pending ? "Bezig…" : "Aanmelding starten"}</Button><Message state={state} /></form>; }
export function ForgotPasswordForm() { const [state, action, pending] = useActionState(sendPasswordReset, initialState); return <form action={action} className="space-y-4"><div><Label htmlFor="email">E-mailadres</Label><Input id="email" name="email" type="email" required /></div><Button className="w-full" disabled={pending}>{pending ? "Versturen…" : "Resetlink versturen"}</Button><Message state={state} /></form>; }
