import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type CurrentUser = { id: string; name: string; role: 'guest'|'admin' }
export type LoginRequest = { email: string; password: string }
export type VerifyCodeRequest = { code: string }

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/api/auth',
        credentials: 'include',           // <— send/receive cookies
    }),
    tagTypes: ['Auth'],
    endpoints: builder => ({
        getCurrentUser: builder.query<CurrentUser, void>({
            query: () => '/current',
            providesTags: ['Auth'],
        }),
        login: builder.mutation<CurrentUser, LoginRequest>({
            query: body => ({ url: '/login', method: 'POST', body }),
            invalidatesTags: ['Auth'],
        }),
        logout: builder.mutation<{ ok: boolean }, void>({
            query: () => ({ url: '/logout', method: 'POST' }),
            invalidatesTags: ['Auth'],
        }),
        verifyCode: builder.mutation<{ ok: boolean; voteId?: string }, VerifyCodeRequest>({
            query: body => ({ url: '/verify-code', method: 'POST', body })
        })
    }),
})

export const {
    useGetCurrentUserQuery,
    useLoginMutation,
    useLogoutMutation,
    useVerifyCodeMutation,
} = authApi
