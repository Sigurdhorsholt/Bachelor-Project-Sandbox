import {useGetCurrentUserQuery, useLogoutMutation} from "../stores/authApi.ts";

export default function AdminPage() {
    const { data } = useGetCurrentUserQuery()
    const [logout, { isLoading }] = useLogoutMutation()

    return (
        <main style={{ padding: 24 }}>
            <h1>Admin</h1>
            <p>Signed in as <strong>{data?.name}</strong></p>
            <button onClick={() => logout()} disabled={isLoading} style={{ marginTop: 8 }}>
                {isLoading ? 'Signing out…' : 'Sign out'}
            </button>
            <p style={{ marginTop: 16 }}>
                Here admins can create votes, generate invitations/codes/QR, and monitor tallies. (Coming soon)
            </p>
        </main>
    )
}
