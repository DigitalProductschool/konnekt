from fastapi import APIRouter, Depends

from ..option_sets import OPTION_SETS
from ..schemas import ApiResponse, Option, OptionSet
from ..services.auth import get_current_user

router = APIRouter(
    prefix='/api/option-sets',
    tags=['option-sets'],
    dependencies=[Depends(get_current_user)],
)


@router.get('')
def list_option_sets() -> ApiResponse[list[OptionSet]]:
    """List the value sets of enum fields and parts (spec 002, research R6).

    The catalog's fields name their set by its key. Licence classes carry their
    description, such as "Cars up to 3.5 t".
    """
    return ApiResponse(
        data=[
            OptionSet(
                key=key, options=[Option.model_validate(option) for option in options]
            )
            for key, options in OPTION_SETS.items()
        ]
    )
