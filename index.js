const express   = require('express');
const app       = express();
var swig        = require('swig-templates');
var bodyParser  = require('body-parser');
var session     = require('express-session');
var mysql       = require('mysql');
var md5         = require('md5');
var flash       = require('@avaly/connect-flash');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret: "holahaloholahalo"}));
app.use(flash());

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'posttest'
});

app.get('/', (req, res) => {
    if(req.session.username){
        connection.query('select a.id, a.username, count(b.voting_candidate) as totalvote from user a left join vote b on a.id=b.voting_candidate where a.role!=1 group by a.username', function(err, results, fields){
            if(err){
                throw err;
            }
            else{
                connection.query('select id, username from user where role!=1 and id!="'+req.session.userid+'"', function(err, userlistresult, fields){
                    var html    = swig.compileFile('templates/index.html');
                    var output  = html({
                        title                : 'Index Page',
                        datauser             : req.session,
                        datavote             : results,
                        userlist             : userlistresult,
                        flashmsg_failvote    : req.flash('fail-vote'),
                        flashmsg_successvote : req.flash('success-vote'),
                    });
                    res.end(output);
                });
            }
        });
    }
    else{
        res.redirect('/login');
    }
});

app.post('/', (req, res) => {
    if(!req.session.username)
    return res.redirect('/login');
    
    connection.query('select is_voting from user where username="'+req.session.username+'"', function(err, results, fields){
        if(err){
            throw err;
        }
        else{
            if(results[0].is_voting==0){
                connection.query('update user set is_voting=1 where ?', {username: req.session.username}, function(err, results, fields){
    
                });
                connection.query('insert into vote set ?', {voting_candidate: req.body.usertovote, voter: req.session.userid}, function(err, results, fields){});

                req.flash('success-vote', 'Voting success');
                res.redirect('/');
                res.end();
            }
            else{
                req.flash('fail-vote', 'You already have vote someone');
                res.redirect('/');
                res.end();
            }
        }
    });
});

app.get('/signup', (req, res) => {
    if(req.session.username){
        res.redirect('/');
    }
    else{
        var html    = swig.compileFile('templates/signup.html');
        var output  = html({
            title           : 'Signup Page',
            flashmsg_err    : req.flash('error-signup'),
            flashmsg_succes : req.flash('success-signup')
        });
        res.end(output);
    }
});

app.post('/signup', (req, res) => {
    connection.query('select count(id) as countdata from user where username="'+req.body.username+'"', function(err, results, fields){
        if(err){
            throw err;
        }
        else{
            if(results[0].countdata>0){
                req.flash('error-signup', 'Username is exist');
                res.redirect('/signup');
                res.end();
            }
            else{
                connection.query('insert into user set ?', {username: req.body.username, password: md5(req.body.password)}, function(err, results, fields){
                    if(err) throw err;
                    
                    req.flash('success-signup', 'Signup success');
                    res.redirect('/signup');
                    res.end();
                })
            }
        }
    });
});

app.get('/login', (req, res) => {
    if(req.session.username){
        res.redirect('/');
    }
    else{
        var html    = swig.compileFile('templates/login.html');
        var output  = html({
            title : 'Login Page',
            flashmsg : req.flash('error-login')
        });
        res.end(output);
    }
});

app.post('/login', (req, res) => {
    connection.query('select * from user where username="'+req.body.username+'" and password="'+md5(req.body.password)+'"', function(err, results, fields){
        if(err){
            throw err;
        }
        else{
            if(results.length){
                req.session.userid = results[0].id;
                req.session.username = results[0].username;
                req.session.role = results[0].role;
                res.redirect(301, '/');
            }
            else{
                req.flash('error-login', 'You are not authenticated')
                res.redirect('/login');
                res.end();
            }
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/candidate', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('select a.id, a.username, count(b.voting_candidate) as totalvote from user a left join vote b on a.id=b.voting_candidate where a.role!=1 group by a.username', function(err, results, fields){
            if(err){
                throw err;
            }
            else{
                var html    = swig.compileFile('templates/candidate.html');
                var output  = html({
                    title                            : 'Candidate Page',
                    datauser                         : req.session,
                    datavote                         : results,
                    flashmsg_successadd              : req.flash('success-addcandidate'),
                    flashmsg_successaddvote          : req.flash('success-addvote'),
                    flashmsg_successremovevote       : req.flash('success-removevote'),
                    flashmsg_successdeletecandidate  : req.flash('success-deletecandidate'),
                    flashmsg_successresetvote        : req.flash('success-resetvote')
                });
                res.end(output);
            }
        });
    }
});

app.get('/candidate/add', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        var html    = swig.compileFile('templates/candidate-add.html');
        var output  = html({
            title                       : 'Candidate Page',
            datauser                    : req.session,
            flashmsg_erroraddcandidate  : req.flash('error-addcandidate'),
        });
        res.end(output);
        res.end()
    }
});

app.post('/candidate/add', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('select id from user where username="'+req.body.username+'"', function(err, results, fields){
            if(err){
                throw err;
            }
            else{
                if(results.length){
                    req.flash('error-addcandidate', 'Username exist');
                    res.redirect('/candidate/add');
                    res.end();
                }
                else{
                    connection.query('insert into user set ?', {username: req.body.username, password: md5('123')}, function(err, results, fields){
                        if(err) throw err;

                        req.flash('success-addcandidate', 'Add candidate success');
                        res.redirect('/candidate');
                        res.end();
                    });
                }
            }
        });
    }
});

app.get('/detail-vote/:id', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('select username from user where id="'+req.params.id+'"', function(err, results, fields){
            if(err){
                throw err;
            }
            else{
                if(results.length){
                    var totalvote = 0;
                    connection.query('select count(id) as totalvote from vote where voting_candidate="'+req.params.id+'"', function(err, results, fields){
                        totalvote = results[0].totalvote;
                    });

                    connection.query('select a.username from user a left join vote b on a.id=b.voter where b.voting_candidate="'+req.params.id+'"', function(err, results, fields){
                        if(err) throw err;

                        var html    = swig.compileFile('templates/detail-vote.html');
                        var output  = html({
                            title       : 'Detail Vote Page',
                            datauser    : req.session,
                            totalvote   : totalvote,
                            voter       : results
                        });
                        res.end(output);
                    });
                }
                else{
                     res.redirect('/notfound');
                     res.end();
                }
            }
        });
    }
});

app.get('/add-vote/:id', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('insert into vote set ?', {voting_candidate: req.params.id, voter: req.session.userid}, function(err, results, fields){
            if(err) throw err;

            req.flash('success-addvote', 'Add a vote success');                
            res.redirect('/candidate');
            res.end();
        });
    }
});

app.get('/remove-vote/:id', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('delete from vote where ? order by id desc limit 1', {voting_candidate: req.params.id}, function(err, results, fields){
            if(err) throw err;

            req.flash('success-removevote', 'Remove a vote success');                
            res.redirect('/candidate');
            res.end();
        });
    }
});

app.get('/delete-candidate/:id', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('delete from user where ?', {id: req.params.id}, function(err, results, fields){
            if(err) throw err;
            
            if(results){
                connection.query('delete from vote where ?', {voting_candidate: req.params.id}, function(err2, results2, fields2){});
            }
            req.flash('success-deletecandidate', 'Delete a candidate success');                
            res.redirect('/candidate');
            res.end();
        });
    }
});

app.get('/reset-vote/:id', (req, res) => {
    if(!req.session.username || req.session.role!=1){
        res.redirect('/login');
    }
    else{
        connection.query('delete from vote where ?', {voting_candidate: req.params.id}, function(err, results, fields){
            if(err) throw err;
            
            req.flash('success-resetvote', 'Reset vote from candidate success');                
            res.redirect('/candidate');
            res.end();
        });
    }
});

app.get('/notfound', (req, res) => {
    res.send('<h2>The page you requested not found</h2>')
});

app.get('*', (req, res) => {
    res.send('404 Not Found');
});

app.listen(8888, () => {
    console.log(`Server started on port`);
});