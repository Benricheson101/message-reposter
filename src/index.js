import {Client} from 'discord.js';
import {parseConfig} from './env';

parseConfig('config.yml');

new Client({
  disableMentions: 'all',
});
