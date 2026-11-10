from fastapi import APIRouter, Depends

from ..option_sets import OPTION_SETS, description_of, label_of
from ..schemas import ApiResponse, Option, OptionSet
from ..services.auth import get_current_principal

router = APIRouter(
    prefix='/api/option-sets',
    tags=['option-sets'],
    dependencies=[Depends(get_current_principal)],
)


@router.get('')
def list_option_sets() -> ApiResponse[list[OptionSet]]:
    """List the value sets of enum fields and parts (spec 002, research R6).

    The catalog's fields name their set by its key. Licence classes carry their
    description, such as "Cars up to 3.5 t". Labels and descriptions follow the
    request's language; the keys, values and order never change (spec 009, R6).
    """
    return ApiResponse(
        data=[
            OptionSet(
                key=key,
                options=[
                    Option(
                        value=option.value,
                        label=label_of(option),
                        description=description_of(option),
                    )
                    for option in options
                ],
            )
            for key, options in OPTION_SETS.items()
        ]
    )
