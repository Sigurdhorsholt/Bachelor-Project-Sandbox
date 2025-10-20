// src/Redux/divisionsApi.ts
import { api } from "./api";

export type Division = {
    id: string;
    name: string;
    // add more fields when your backend exposes them
};

export const divisionsApi = api.injectEndpoints({
    endpoints: (b) => ({
        
        // GET /api/organisations/:orgId/divisions
        getDivisions: b.query<Division[], string>({
            query: (orgId) => `/organisations/${orgId}/divisions`,
            // List-tag pattern per org: invalidating this tag refetches the list
            providesTags: (_result, _err, orgId) => [{ type: "Division", id: `LIST-${orgId}` }],
        }),

        // POST /api/organisations/:orgId/divisions
        createDivision: b.mutation<Division, { orgId: string; name: string }>({
            query: ({ orgId, name }) => ({
                url: `/organisations/${orgId}/divisions`,
                method: "POST",
                body: { name },
            }),
            // after success, invalidate the list tag so getDivisions refetches
            invalidatesTags: (_result, _err, { orgId }) => [{ type: "Division", id: `LIST-${orgId}` }],
        }),
        
        
    }),
    overrideExisting: false,
});

export const {
    useGetDivisionsQuery,
    useCreateDivisionMutation,
} = divisionsApi;
