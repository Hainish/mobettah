#!/usr/bin/env node
var config = require('./config');
var spawn = require('child_process').spawn;
var colors = require('colors');
var mail = require('mail').Mail(config);

var RESTART_INTERVAL = 1000; // 1 second
var UNIT_TIME = 3600000; // 1 hour
var ALERT_INTERVAL = 3600000; // 1 hour
var MAX_RESTARTS_ALLOWED = 6;
var restart = true;
var rput = 0;
var restart_message_sent_recently = false;

run_jb();

function run_jb(){
  var jb = spawn('node',['job_board.js']);
  console.log('Spawning a new job board process');

  jb.stdout.on('data', function(data){
    process.stdout.write('I '.green + data);
  });

  jb.stderr.on('data', function(data){
    process.stdout.write('E '.red + data);
  });

  jb.on('exit', function(code){
    console.log('job board exited with code ' + code);   
    handle_child_exit();
  });
}

function check_status(){
  if(rput > MAX_RESTARTS_ALLOWED && !restart_message_sent_recently){
    alert_max_restarts_exceeded(function(err){
      if(err){
        console.log('Alert NOT sent: max restarts exceeded')
      } else {
        console.log('Alert sent: max restarts exceeded');
      }
    });
    restart_message_sent_recently = true;
    setTimeout(function(){
      restart_message_sent_recently = false;
    },ALERT_INTERVAL);
  }
}

function handle_child_exit(){
  // log restart attempt, send alert if max restarts is exceeded
  rput++;
  setTimeout(function(){
    rput--;
  }, UNIT_TIME);

  check_status();

  // restart proccess or send restart failed alert
  if(restart){
    run_jb();
    restart = false;
    setTimeout(function(){
      restart = true;
    },RESTART_INTERVAL);
  } else {
    alert_failed_restart(function(err){
      if(err){
        console.log('Alert NOT sent: failed restart. shutting down. You are screwed.');
      } else {
        console.log('Alert sent: failed restart. shutting down.');
      }
      process.exit();
    });
  }
}

function alert_failed_restart(callback){
  alert_helper(config.failed_restart_subject, config.failed_restart_body, callback);
}

function alert_max_restarts_exceeded(callback){
  alert_helper(config.max_restarts_subject, config.max_restarts_body, callback);
}

function alert_helper(subject, body, callback){
  mail.message({
    from: config.username,
    to: [config.recipient],
    subject: subject
  })
  .body(body)
  .send(function(err) {
    if (err){
      callback(err);
    } else {
      callback(null);
    }
  }); 
}
