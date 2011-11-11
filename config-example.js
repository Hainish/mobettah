module.exports = {
  host: 'smtp.gmail.com',
  username: 'me@gmail.com',
  password: '**password**',
  recipient: 'example@domain.tld',
  failed_restart_subject: 'Critical: Job Board failing on restart',
  failed_restart_body: 'Job Board is failing on restart.  Your attention is required to fix the problem',
  max_restarts_subject: 'Warning: Max restarts reached',
  max_restarts_body: 'Job Board restarts have reached the critical threshold.  You may want to check up on the Job Board process.'
};
