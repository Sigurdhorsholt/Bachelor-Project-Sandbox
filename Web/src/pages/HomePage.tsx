import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {useGetCurrentUserQuery, useLoginMutation, useVerifyCodeMutation} from "../stores/authApi.ts";

export default function HomePage() {
    const navigate = useNavigate()
    const { data: me } = useGetCurrentUserQuery()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [code, setCode] = useState('')
    const [login, { isLoading: loggingIn, error: loginErr }] = useLoginMutation()
    const [verify, { isLoading: verifying, error: verifyErr }] = useVerifyCodeMutation()

    const onAdminSignIn = async () => {
        const res = await login({ email, password }).unwrap()
        console.log("logging in")
        if (res.role === 'admin') navigate('/admin')
        console.log("redirected")
    }

    const onEnterCode = async () => {
        const res = await verify({ code }).unwrap()
        if (res.ok) navigate(`/vote/${res.voteId ?? 'demo'}`)
    }

    const onScanQr = () => {
        // Placeholder for later (camera/QR lib). For now, navigate to a demo vote.
        navigate('/vote/demo')
    }

    return (
        <main style={{ maxWidth: 640, margin: '40px auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <h1 style={{ marginBottom: 16 }}>Welcome to Lightweight Voting</h1>

            {me?.role === 'admin' && (
                <div style={{ padding: 12, marginBottom: 16, background: '#eef', borderRadius: 8 }}>
                    You are signed in as <strong>{me.name}</strong>. Go to <a href="/admin">Admin</a>.
                </div>
            )}

            <section style={{ display: 'grid', gap: 24 }}>
                {/* A. Admin sign-in */}
                <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
                    <h2>Admin sign in</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <input
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ padding: 8, flex: '1 1 220px' }}
                        />
                        <input
                            placeholder="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ padding: 8, flex: '1 1 220px' }}
                        />
                        <button onClick={onAdminSignIn} disabled={loggingIn} style={{ padding: '8px 12px' }}>
                            {loggingIn ? 'Signing in…' : 'Sign in'}
                        </button>
                    </div>
                    {loginErr && <p style={{ color: 'crimson' }}>Login failed (mock).</p>}
                </div>

                {/* B. Enter verification code */}
                <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
                    <h2>Enter verification code</h2>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                            placeholder="e.g. 4F9K-7Q"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            style={{ padding: 8, flex: 1 }}
                        />
                        <button onClick={onEnterCode} disabled={verifying} style={{ padding: '8px 12px' }}>
                            {verifying ? 'Checking…' : 'Continue'}
                        </button>
                    </div>
                    {verifyErr && <p style={{ color: 'crimson' }}>Invalid/expired code (mock).</p>}
                </div>

                {/* C. Scan QR (placeholder) */}
                <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16 }}>
                    <h2>Scan QR code</h2>
                    <p>Use your device camera to scan a meeting QR. (We’ll add the scanner later.)</p>
                    <button onClick={onScanQr} style={{ padding: '8px 12px' }}>Open scanner</button>
                </div>
            </section>
        </main>
    )
}
