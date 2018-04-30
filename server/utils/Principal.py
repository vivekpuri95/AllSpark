from flask import jsonify


class Principal:
    def __init__(self):
        print("********", "initial Principal calling", "*********")

    @staticmethod
    def send_response(result, status=True):
        return jsonify({
            "status": status,
            "response": result
        })

