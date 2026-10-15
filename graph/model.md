# Neo4j Graph Model — Healthcare AI Emergency Assistant

## Node Labels

| Label | Key | Properties | Description |
|-------|-----|-----------|-------------|
| `Responder` | `pgId` | `name`, `kind` (doctor/hospital/responder), `tier` (1-3), `available`, `lat`, `lng`, `specialty` | Healthcare provider who can accept alerts |
| `Facility` | `name` | `lat`, `lng` | Hospital or clinic location |
| `Specialty` | `name` | — | Medical specialty (e.g. "Cardiology", "Emergency medicine") |
| `IncidentType` | `name` | — | Cardiac arrest, Severe bleeding, Choking, Unknown |
| `ProtocolTree` | `treeId` | `title` | CPR, Bleeding, Choking |
| `ProtocolStep` | `(treeId, stepId)` | `text`, `type` (question/instruction/end) | Single node in a decision tree |
| `Incident` | `id` | `type`, `lat`, `lng`, `createdAt`, `report`, `reportConfirmedBy` | A reported emergency |
| `User` | `pgId` | `name`, `role` | Bystander, Doctor, Patient, Family |

## Relationships

| Type | Direction | Properties | Meaning |
|------|-----------|-----------|---------|
| `HAS_SPECIALTY` | Responder → Specialty | — | Responder's medical specialty |
| `AFFILIATED_WITH` | Responder → Facility | — | Responder works at this facility |
| `NEEDS` | IncidentType → Specialty | — | Which specialties handle this incident type |
| `GUIDED_BY` | IncidentType → ProtocolTree | — | Which protocol assists with this incident type |
| `STARTS_AT` | ProtocolTree → ProtocolStep | — | Entry point of the decision tree |
| `YES` | ProtocolStep → ProtocolStep | — | "Yes" branch of a question |
| `NO` | ProtocolStep → ProtocolStep | — | "No" branch of a question |
| `NEXT` | ProtocolStep → ProtocolStep | — | Unconditional next step (instruction) |
| `OF_TYPE` | Incident → IncidentType | — | What type of incident this is |
| `ALERTED` | Incident → Responder | `tier`, `sentAt`, `ackAt`, `eta`, `reason` | Responder was alerted for this incident |
| `FOLLOWED` | User/Responder → ProtocolStep | `order`, `answer` (yes/no) | Someone followed a step in the protocol |
| `CONSENTS_TO` | User → Patient | `active`, `since` | Family member has care-link access to patient |

## Constraints & Indexes

```cypher
CREATE INDEX responderPgId FOR (r:Responder) ON (r.pgId)
CREATE INDEX specialtyName  FOR (s:Specialty) ON (s.name)
CREATE INDEX facilityName   FOR (f:Facility) ON (f.name)
CREATE INDEX incidentType   FOR (i:IncidentType) ON (i.name)
CREATE INDEX protocolTreeId FOR (pt:ProtocolTree) ON (pt.treeId)
CREATE INDEX protocolStepId FOR (ps:ProtocolStep) ON (ps.treeId, ps.stepId)
```

## IncidentType → Specialty Mapping (NEEDS edges)

| IncidentType | Specialties that can help |
|---|---|
| Cardiac arrest | Emergency medicine, Cardiology |
| Severe bleeding | Emergency medicine, Hematology, General surgery |
| Choking | Emergency medicine, ENT |
| Unknown | Emergency medicine |

## Example Queries

```cypher
// Nearest available Tier-1 doctor within 5 km
MATCH (r:Responder)-[:HAS_SPECIALTY]->(s:Specialty {name: 'Emergency medicine'})
WHERE r.available AND r.tier = 1
WITH r, point.distance(point({latitude: $lat, longitude: $lng}), point({latitude: r.lat, longitude: r.lng})) AS d
WHERE d <= 5000
RETURN r.name, s.name, d ORDER BY d LIMIT 5;

// Protocol decision path for CPR
MATCH p=(pt:ProtocolTree {treeId: 'cpr'})-[:STARTS_AT]->(step:ProtocolStep)
       -[:YES|NO|NEXT*0..10]->(next)
RETURN p;

// Who can see patient X? (consent audit)
MATCH (family:User)-[:CONSENTS_TO]->(patient:User {pgId: $patientId})
WHERE family.active = true
RETURN family.name;
```
