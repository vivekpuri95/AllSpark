var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond witty');
});

router.get('/hello', function(req, res, next) {
    res.render('index', { title: 'hello' });
});

module.exports = router;
