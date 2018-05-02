from flask import Flask
from .Principal import Principal


class Application(Principal, object):

    def __init__(self, blueprints=None):
        super(Application, self).__init__()
        self.blueprints = blueprints

    def create_app(self, app_config=None, app_name=__name__,):
        app = Flask(app_name)

        app.config.from_object(app_config)

        return app
