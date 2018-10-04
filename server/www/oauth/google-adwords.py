import os

import pandas as pd
from flask import Blueprint

from ..utils.API import API

class GoogleAdwords(API, object):
    def __init__(self):
        super().__init__()

    def getData(self, data_obj):



ga = Blueprint("ga", __name__)


@ga.route("/get", methods=["POST"])
def create():
    adwords = GoogleAdwords()
    return adwords.send_response(adwords.execute(adwords.getData))
