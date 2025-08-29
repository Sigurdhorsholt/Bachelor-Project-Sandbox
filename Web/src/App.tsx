import { useEffect, useState } from 'react'

export default function App() {
    const [ping, setPing] = useState<any>(null)

    useEffect(() => {
        fetch('/api/ping')
            .then(r => r.json())
            .then(setPing)
            .catch(err => setPing({ error: String(err) }))
    }, [])

    return (
        <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
            <h1>React + .NET sandbox</h1>
            <p>API says: {ping ? JSON.stringify(ping) : '…loading'}</p>
        </main>
    )
}
