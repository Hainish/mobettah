#!/usr/bin/env node
var config = require('./config');
var spawn = require('child_process').spawn;
var colors = require('colors');
var mail = require('mail').Mail(config.mail);
var fs = require('fs');

var PID_FILE_PATH = "/tmp/mobettah.pid";
var RESTART_INTERVAL = 1000; // 1 second
var UNIT_TIME = 3600000; // 1 hour
var ALERT_INTERVAL = 3600000; // 1 hour
var MAX_RESTARTS_ALLOWED = 6;
var restart = true;
var rput = 0;
var restart_message_sent_recently = false;
var child = undefined;

create_pid_file();

start();

process.on('SIGINT', function(){
  stop();
});

process.on('SIGTERM', function(){
  stop();
});

function start(){
  child = spawn(process.argv[2], process.argv.slice(3));
  console.log('Spawning a new child process');

  child.stdout.on('data', function(data){
    process.stdout.write('I '.green + data);
  });

  child.stderr.on('data', function(data){
    process.stdout.write('E '.red + data);
  });

  child.on('exit', function(code){
    console.log('child process exited with code ' + code);   
    handle_child_exit();
  });
}

function stop(){
  child.removeAllListeners('exit');
  child.on('exit',function(){
    delete_pid_file();
    console.log('Child process killed.  exiting mobettah...');
    process.exit();
  });
  child.kill();
}

function create_pid_file(){
  fs.writeFileSync(PID_FILE_PATH, process.pid);
}

function delete_pid_file(){
  fs.unlinkSync(PID_FILE_PATH);
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

function handle_child_exit(command, callback){
  // log restart attempt, send alert if max restarts is exceeded
  rput++;
  setTimeout(function(){
    rput--;
  }, UNIT_TIME);

  check_status();

  // restart proccess or send restart failed alert
  if(restart){
    start();
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
      delete_pid_file();
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
    from: config.mail.username,
    to: [config.mail.recipient],
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
