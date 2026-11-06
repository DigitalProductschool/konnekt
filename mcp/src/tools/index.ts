// Every tool module, imported for its registrations in `registry`: the server and the guidance
// gate (`guidance.test.ts`) import this module, so both see the same tools. A new tool module is
// imported here, and its tools are described in mcp/plugin/skills/ in the same change (FR-038)
import './read';
import './catalog';
import './access';

export { registry, tools } from './registry';
