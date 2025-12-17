-- Rollback any existing transaction first
rollback;

begin transaction;

-- Delete from the deepest level first (auditableevents)
DELETE FROM public.auditableevents
WHERE voteid IN (
    SELECT v.id FROM public.votes v
                         INNER JOIN public.ballots b ON v.ballotid = b.id
                         INNER JOIN public.admissiontickets at ON b.admissionticketid = at.id
WHERE at.meetingid IN (
    'd2a1c612-69e5-49f4-8962-705dfe41867b',
    '01da8734-f731-468e-b231-d55970e1bad3',
    'fa6cf299-42e7-4112-b0b6-db8ccf04c677',
    '871b3672-3551-457c-b731-9a9183d61733',
    '2b46493e-8eef-485a-bf46-f3451ef2a93c',
    '9f22995f-a8e6-4e58-8d2d-b86a986514c3',
    'b9e14283-8172-4bff-8aea-5ef5c1aecc86',
    '26521bfd-39f7-4748-bc76-cbe2604be71e',
    'cbbdb6e1-facc-44c4-a6fd-de53de0ea413',
    'c7a98ca2-8a36-4306-934e-24f3fe99980c'
    )
    );

-- Delete from the deepest level first (votes)
DELETE FROM public.votes
WHERE ballotid IN (
    SELECT b.id FROM public.ballots b
                         INNER JOIN public.admissiontickets at ON b.admissionticketid = at.id
WHERE at.meetingid IN (
    'd2a1c612-69e5-49f4-8962-705dfe41867b',
    '01da8734-f731-468e-b231-d55970e1bad3',
    'fa6cf299-42e7-4112-b0b6-db8ccf04c677',
    '871b3672-3551-457c-b731-9a9183d61733',
    '2b46493e-8eef-485a-bf46-f3451ef2a93c',
    '9f22995f-a8e6-4e58-8d2d-b86a986514c3',
    'b9e14283-8172-4bff-8aea-5ef5c1aecc86',
    '26521bfd-39f7-4748-bc76-cbe2604be71e',
    'cbbdb6e1-facc-44c4-a6fd-de53de0ea413',
    'c7a98ca2-8a36-4306-934e-24f3fe99980c'
    )
    );

-- Delete ballots related to the meetings
DELETE FROM public.ballots
WHERE admissionticketid IN (
    SELECT id FROM public.admissiontickets
    WHERE meetingid IN (
                        'd2a1c612-69e5-49f4-8962-705dfe41867b',
                        '01da8734-f731-468e-b231-d55970e1bad3',
                        'fa6cf299-42e7-4112-b0b6-db8ccf04c677',
                        '871b3672-3551-457c-b731-9a9183d61733',
                        '2b46493e-8eef-485a-bf46-f3451ef2a93c',
                        '9f22995f-a8e6-4e58-8d2d-b86a986514c3',
                        'b9e14283-8172-4bff-8aea-5ef5c1aecc86',
                        '26521bfd-39f7-4748-bc76-cbe2604be71e',
                        'cbbdb6e1-facc-44c4-a6fd-de53de0ea413',
                        'c7a98ca2-8a36-4306-934e-24f3fe99980c'
        )
);

-- Delete votation records related to the meetings
DELETE FROM public.votation
WHERE meetingid IN (
                    'd2a1c612-69e5-49f4-8962-705dfe41867b',
                    '01da8734-f731-468e-b231-d55970e1bad3',
                    'fa6cf299-42e7-4112-b0b6-db8ccf04c677',
                    '871b3672-3551-457c-b731-9a9183d61733',
                    '2b46493e-8eef-485a-bf46-f3451ef2a93c',
                    '9f22995f-a8e6-4e58-8d2d-b86a986514c3',
                    'b9e14283-8172-4bff-8aea-5ef5c1aecc86',
                    '26521bfd-39f7-4748-bc76-cbe2604be71e',
                    'cbbdb6e1-facc-44c4-a6fd-de53de0ea413',
                    'c7a98ca2-8a36-4306-934e-24f3fe99980c'
    );

-- Now delete the meetings (CASCADE will handle agendaitems, propositions, voteoptions, admissiontickets)
DELETE FROM public.meetings
WHERE id IN (
             'd2a1c612-69e5-49f4-8962-705dfe41867b',
             '01da8734-f731-468e-b231-d55970e1bad3',
             'fa6cf299-42e7-4112-b0b6-db8ccf04c677',
             '871b3672-3551-457c-b731-9a9183d61733',
             '2b46493e-8eef-485a-bf46-f3451ef2a93c',
             '9f22995f-a8e6-4e58-8d2d-b86a986514c3',
             'b9e14283-8172-4bff-8aea-5ef5c1aecc86',
             '26521bfd-39f7-4748-bc76-cbe2604be71e',
             'cbbdb6e1-facc-44c4-a6fd-de53de0ea413',
             'c7a98ca2-8a36-4306-934e-24f3fe99980c'
    );

-- Uncomment to commit or keep as rollback for testing
--rollback transaction;
commit transaction;
