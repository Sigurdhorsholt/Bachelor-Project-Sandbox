import { useParams } from 'react-router-dom'

export default function VotePage() {
    const { voteId } = useParams()
    return (
        <main style={{ padding: 24 }}>
            <h1>Vote</h1>
            <p>Vote ID: <strong>{voteId}</strong></p>
            <p>(This will render the ballot for an admitted user.)</p>
        </main>
    )
}
