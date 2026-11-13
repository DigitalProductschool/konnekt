// The connection PDF's five fonts (specs/011-connection-pdf, research R7): the committed Fira
// TTFs' URLs, which Vite fingerprints as assets of their own. Only the PDF worker imports this
// module, with a dynamic `import()` on its first run, so neither the URLs nor the files reach the
// main bundle; the worker fetches the files and passes their bytes to `renderConnectionPdf()`
import firaMonoMedium from '../assets/fonts/FiraMono-Medium.ttf?url';
import firaMonoRegular from '../assets/fonts/FiraMono-Regular.ttf?url';
import firaSansMedium from '../assets/fonts/FiraSans-Medium.ttf?url';
import firaSansRegular from '../assets/fonts/FiraSans-Regular.ttf?url';
import firaSansSemiBold from '../assets/fonts/FiraSans-SemiBold.ttf?url';
import type { PdfFont } from '../utils/connectionPdf/types';

/** Each font's URL, by the name `renderConnectionPdf()` registers it under (`PdfFonts`' keys) */
export const PDF_FONT_URLS: Readonly<Record<PdfFont, string>> = {
  regular: firaSansRegular,
  medium: firaSansMedium,
  semiBold: firaSansSemiBold,
  mono: firaMonoRegular,
  monoMedium: firaMonoMedium,
};
