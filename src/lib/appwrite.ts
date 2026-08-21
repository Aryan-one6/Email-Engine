import { Account, Client, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint('https://sgp.cloud.appwrite.io/v1')
  .setProject('6a882bdb0009b0f946b6');

const account = new Account(client);
const databases = new Databases(client);

export { client, account, databases };
