"""QR codes of wallet links (research R11).

serviceBW receives the cross-device link as a PNG data URI, so it can show the code
with `<img src="…">` without a second call to the middleware.
"""

import segno

# Error correction level M: about 15% of the code can be damaged or covered
ERROR_CORRECTION = 'm'
# Pixels per module. A cross-device link of 200-300 characters needs 57-69 modules,
# so the image is 325-385 px wide, quiet zone included
SCALE = 5
# The quiet zone the QR code standard requires, in modules
QUIET_ZONE = 4


def png_data_uri(link: str) -> str:
    """Render a link as a QR code, returned as `data:image/png;base64,…`."""
    # make_qr never picks a Micro QR code, and boost_error=False keeps level M
    qr_code = segno.make_qr(link, error=ERROR_CORRECTION, boost_error=False)
    data_uri: str = qr_code.png_data_uri(scale=SCALE, border=QUIET_ZONE)
    return data_uri
