// The largest connection: 20 variants (Standard + 19 based) with 200 rules and groups each
// (40 groups of 4 rules = 40 groups + 160 rules), realistic texts, some long value lists, marks
const BASE = 'https://connect.stuttgart.example/api/connect/3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71';
const COUNTRIES = ['Austria','Belgium','Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland','France','Germany','Greece','Hungary','Ireland','Italy','Latvia','Lithuania','Luxembourg','Malta','Netherlands','Poland','Portugal','Romania','Slovakia','Slovenia','Spain','Sweden','Iceland','Liechtenstein','Norway','Switzerland','United Kingdom','Ukraine','Türkiye','Serbia','Albania','Montenegro','North Macedonia','Bosnia and Herzegovina','Moldova'];
const longList = (n) => `is one of ${COUNTRIES.slice(0, n).map((c) => `“${c}”`).join(', ')}`;
const msg = (i) => i % 25 === 0
  ? 'You need to meet this requirement before the authority can process your application. '.repeat(6).trim() // ~500 chars
  : `You must meet requirement ${i}: please check the documents you share with the wallet before applying.`;
function items(variant, based) {
  const out = [];
  let r = 1;
  for (let g = 1; g <= 40; g += 1) {
    const members = [];
    for (let k = 0; k < 4; k += 1, r += 1) {
      const predicate = r % 37 === 0 ? longList(40) : r % 11 === 0 ? longList(12) : `is at least ${18 + (r % 10)} years old`;
      let mark = null;
      if (based && (r + variant) % 13 === 0) mark = 'changed';
      if (based && (r + variant) % 29 === 0) mark = 'removed';
      members.push({ type: 'rule', id: `rule-${r}`, name: `Requirement ${r} for the licence holder${r % 9 === 0 ? ' with a rather long descriptive name that goes on' : ''}`, mark,
        subject: r % 2 ? 'Personal ID · Date of birth (Age)' : 'Personal ID · Nationality', predicate, message: msg(r) });
    }
    let gmark = null;
    if (based && (g + variant) % 17 === 0) gmark = 'added';
    out.push({ type: 'group', id: `group-${g}`, name: `Group ${g} of related requirements`, operator: g % 2 ? 'or' : 'and', items: members,
      message: g % 3 ? `You must meet at least one of the requirements of group ${g}.` : null, mark: gmark });
  }
  return out;
}
export function bigConnection() {
  const branches = Array.from({ length: 20 }, (_, v) => ({
    id: v === 0 ? 'b-main' : `0c1d2e3f-4a5b-4c6d-8e7f-${String(v).padStart(12, '0')}`,
    name: v === 0 ? 'Standard' : `Variant number ${v} for a district of the city`,
    description: v === 0 ? null : `Applies to applicants from district ${v}, with its own local requirements and exceptions.`,
    origin: v === 0 ? 'main' : 'based', operator: 'and', operator_mark: null,
    pull_url: v === 0 ? `${BASE}/requests/{reference}` : `${BASE}/branches/0c1d2e3f-4a5b-4c6d-8e7f-${String(v).padStart(12, '0')}/requests/{reference}`,
    items: items(v, v > 0),
  }));
  return {
    id: '3f9a1c2e-7b4d-4c1a-9e2f-5d8b6a0c4e71',
    name: 'A connection at the product’s limits: twenty variants with two hundred rules and groups each, to measure generation',
    description: 'Synthetic connection for the spike. '.repeat(10).trim(),
    is_active: true, trigger_url: `${BASE}/requests`,
    documents: [
      { document_type: 'pid', label: 'Personal ID', fields: [['family_name','Family name'],['given_name','Given names'],['birth_date','Date of birth'],['nationality','Nationality'],['address','Address']] },
      { document_type: 'mdl', label: 'Driving licence', fields: [['document_number','Licence number'],['driving_privileges','Licence classes'],['issue_date','Issue date'],['expiry_date','Expiry date']] },
    ],
    branches,
  };
}
