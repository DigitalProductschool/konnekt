# Contract: management API changes

**Users**: the DO.IT management UI. **Requirements**: FR-007 (third bullet), FR-018, FR-020.
**Decisions**: research R1, R9.

This feature adds **no endpoint** and changes **no request or answer** except one additive field
of the catalog. The findings are computed in the browser and never sent to the backend (FR-018,
FR-019). Spec 002's contracts
([../../002-connection-rules/contracts/management-api.md](../../002-connection-rules/contracts/management-api.md),
[../../002-connection-rules/contracts/integration-api.md](../../002-connection-rules/contracts/integration-api.md))
apply unchanged. serviceBW's answers in particular stay byte for byte the same (FR-018, SC-004).

## `GET /api/document-types` (signed in)

Each field and each part gains `multiple_values`: whether a document can give several values for
it. It is true for the Personal ID's "Nationality" (`nationalities`) and for the driving licence's
"Licence classes" (part `classes` of `driving_privileges`), and false everywhere else.

```json
{
  "data": [
    {
      "key": "pid",
      "label": "Personal ID",
      "fields": [
        {
          "key": "nationalities",
          "label": "Nationality",
          "kind": "enum",
          "option_set": "countries",
          "date_of_birth": false,
          "multiple_values": true,
          "parts": null
        },
        {
          "key": "place_of_birth",
          "label": "Place of birth",
          "kind": "parts",
          "option_set": null,
          "date_of_birth": false,
          "multiple_values": false,
          "parts": [
            {
              "key": "country",
              "label": "Country",
              "kind": "enum",
              "option_set": "countries",
              "per_licence_class": false,
              "multiple_values": false
            }
          ]
        }
      ]
    }
  ]
}
```

(Shortened. Every field and part has the attribute.)

- Schemas: `DocumentField.multiple_values: bool` and `FieldPart.multiple_values: bool` in
  `backend/app/schemas.py`, read from the catalog (`from_attributes`) as the other attributes are.
- Frontend: `multiple_values: boolean` on `DocumentField` and `FieldPart` in
  `frontend/src/types/document-types.ts`, in the same change (constitution I). The test data in
  `frontend/src/utils/rules/testData.ts` gains it too.
- Compatibility: additive. The frontend and the backend are deployed together.
