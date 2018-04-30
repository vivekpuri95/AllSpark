import inspect


def get_function_signature(func):
    args, varargs, keywords, defaults, kwonlyargs, kwonlydefaults, annotations = inspect.getfullargspec(func)
    if defaults is not None:
        defaults = dict(zip(reversed(args), reversed(defaults)))
    return args, defaults if defaults is not None else {}


def guess_excel_col_name(num):
    LETTERS = '_ABCDEFGHIJKLMNOPQRSTUVWXYZ'

    sol = ""
    while num > 0:
        k = num % 26
        if k == 0:
            k = 26
        sol += LETTERS[k]
        num -= k
        num = num / 26

    a = sol[::-1]
    return a
