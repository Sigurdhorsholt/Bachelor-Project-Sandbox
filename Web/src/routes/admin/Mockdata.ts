
export const MOCK = [
    {
        id: "org-1",
        name: "Danish Housing Org",
        divisions: [
            {
                id: "div-1",
                name: "Copenhagen North",
                meetings: [
                    {id: "m-101", title: "Q4 Budget Approval", startsAt: "2025-11-02T18:00:00Z", status: "Scheduled"},
                    {id: "m-102", title: "Board Election", startsAt: "2025-12-01T17:30:00Z", status: "Draft"},
                ],
            },
            {
                id: "div-2",
                name: "Aarhus West",
                meetings: [
                    {id: "m-201", title: "Maintenance Vote", startsAt: "2025-10-25T16:00:00Z", status: "Scheduled"},
                    {
                        id: "m-202",
                        title: "Extraordinary Assembly",
                        startsAt: "2025-10-30T18:30:00Z",
                        status: "Published"
                    },
                ],
            },
        ],
    },
    {
        id: "org-2",
        name: "Urban Blocks Assoc.",
        divisions: [
            {
                id: "div-3",
                name: "Central",
                meetings: [
                    {id: "m-301", title: "Bylaw Update", startsAt: "2025-11-10T19:00:00Z", status: "Draft"},
                ],
            },
        ],
    },
];