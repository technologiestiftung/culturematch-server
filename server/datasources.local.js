module.exports = {
  db: {
    host: 'localhost',
    port: 5432,
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: 'db',
    connector: 'postgresql',
    createDatabase: true,
  },
  email: {
    name: 'email',
    connector: 'mail',
    transports: [
      {
        type: 'smtp',
        host: process.env.SMTP_HOST,
        secure: false,
        port: 25,
        tls: {
          rejectUnauthorized: false,
        },
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
    ],
  },
};
