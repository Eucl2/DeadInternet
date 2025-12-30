from slowapi import Limiter
from slowapi.util import get_remote_address
#rate limiter
limiter = Limiter(key_func=get_remote_address)