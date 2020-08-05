const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
var cors = require('cors')

require('dotenv').config();

var app = express()
const { Client } = require('pg');

var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.use(cors())


function inserimento(values, callback){ //nome, vincitore, immagine, stagione, 
  
  var client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  client.connect();

  if(values.length > 3){  //verifica se immagine presente nell'array di parametri
    client.query("INSERT INTO punteggi(nome, vincitore, img, stagione) VALUES($1 , $2 , $3 , $4);", values, (err, res) => {
      if (err) throw err;
      client.end();
      callback(null, res.rows)
    });
  }else{
    client.query("INSERT INTO punteggi(nome, vincitore, stagione) VALUES($1 , $2 , $3);", values, (err, res) => {
      if (err) throw err;
      client.end();
      callback(null, res.rows)
    });
  }

  
}

//funzione generica di richiesta al db, con query e parametri 
function richiesta(query, values, callback) {

  var client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  client.connect();

  client.query(query, values, (err, res) => {
    if (err) throw err;
    client.end();
    callback(null, res.rows)
  });
}


app.get('/', function (req, res) {
  res.send("")
});

//prendi punteggi generali in ordine cronologico
app.get('/punteggi', async (req, res) => {
  richiesta('SELECT data, punteggi.nome AS nomepartita, vincitore, img, stagione, persone.nome FROM punteggi LEFT JOIN persone ON punteggi.vincitore = persone.id ORDER BY punteggi.data DESC;', null, function (err, value) {
    res.json(value)
  });
});

//prendi classifica data la stagione
app.get('/classifica/:stagione', function (req, res) {
  richiesta('SELECT id, nome, COALESCE(count, 0) AS conteggio FROM persone LEFT JOIN (SELECT vincitore, COUNT(vincitore) FROM punteggi WHERE stagione = $1 GROUP BY punteggi.vincitore) punteggimax ON persone.id = punteggimax.vincitore ORDER BY conteggio DESC', [req.params.stagionepassata] , function (err, value) {
    res.json(value)
  });
});

//prendi array di classifiche filtrate per stagione
app.get('/classifica', function (req, res) {
  richiesta('SELECT id, nome, COALESCE(count, 0) AS conteggio FROM persone LEFT JOIN (SELECT vincitore, COUNT(vincitore) FROM punteggi WHERE stagione = 3 GROUP BY punteggi.vincitore) punteggimax ON persone.id = punteggimax.vincitore ORDER BY conteggio DESC', null, function (err, value) {
    res.json(value)
  });
});

//inserisci nuovo elemento
app.post('/inserisci', function (req, res) {
  inserimento( [req.body.nome, req.body.vincitore, req.body.immagine, req.body.stagione] , function (err, value) {
    if(err){
      res.json(err)
    }
    res.status(200).json("inserito :)")
  });
});

app.listen(PORT, function () {
  console.log('app su porta : ' + PORT);
});
