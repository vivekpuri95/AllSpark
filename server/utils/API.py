from .Principal import Principal
from flask import request
import config
from .common_functions import get_function_signature


class API(Principal):
    def __init__(self):
        """log API """
        Principal.__init__(self)
        self.request = request

        self.config = config

        if self.request.method == 'POST':

            form_data = {i: self.request.form[i] for i in self.request.form}
            request_json = {i: self.request.json[i] for i in self.request.json}
            form_data.update(request_json)

            for i in self.request.files:
                form_data[i] = request.files[i]

        else:
            form_data = {i: request.values[i] for i in request.values}
        self.host = request.headers['Host']
        self.formatted_request_body = form_data

    def validate(self, func):
        arguments, defaults = get_function_signature(func)
        result_arg_list = []

        for argument in arguments:
            if argument == 'self':
                continue

            if argument not in self.formatted_request_body and argument not in defaults:
                raise AssertionError('Missing argument: ' + str(argument))

            else:
                result_arg_list += [self.formatted_request_body.get(argument) or defaults.get(argument)]

        return result_arg_list

    def execute(self, func):
        return func(*self.validate(func))
