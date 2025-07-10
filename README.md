# file-sharing-api

A simple file sharing api server using Express

**Packages Used**

- [Multer](https://www.npmjs.com/package/multer) - Middleware for handling `multipart/form-data`, which is primarily used for uploading files
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) - Basic rate-limiting middleware used to limit repeated requests to public APIs
- [node-cron](https://www.npmjs.com/package/node-cron) - Task scheduler to cleanup old files
- [jest](https://www.npmjs.com/package/jest) - For unit/integration tests

## Node Installation

Install the latest Node LTS for this project (22.17.0)

If you're using NVM, that's ideal for managing your Node.js versions:

```bash
  // For Windows
  nvm install lts
  nvm use lts

  // For Mac
  nvm install --lts
  nvm use --lts
```

## Environment Variables

To run this project, you will need to an `.env` file and add the following environment variables to your `.env` file

`PORT`

`FOLDER`

## Run Locally

Clone the project

```bash
  git clone https://github.com/junpolo/file-sharing-api.git
```

Go to the project directory

```bash
  cd file-sharing-api
```

Use recommended node version (using nvm)

```bash
  nvm use lts
  // OR
  nvm use 22.17.0
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm start
```

## Running Tests

To run tests, run the following command

```bash
  npm test
```

## API Reference

#### Upload files

```http
  POST /api/files
```

| Request Body | Type                  | Description                          |
| :----------- | :-------------------- | :----------------------------------- |
| `files`      | `multipart/form-data` | **Required**. Used to upload file(s) |

#### Get file

```http
  GET /api/files/:publicKey
```

| Parameters  | Type     | Description                       |
| :---------- | :------- | :-------------------------------- |
| `publicKey` | `string` | **Required**. Id of file to fetch |

#### Delete file

```http
  DELETE /api/files/:privateKey
```

| Parameters   | Type     | Description                        |
| :----------- | :------- | :--------------------------------- |
| `privateKey` | `string` | **Required**. Id of file to delete |
