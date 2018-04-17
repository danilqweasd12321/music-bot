var Discord = require('discord.js');
var Bot = new Discord.Client();
var Helper = require('./components/helper.js');
var Queue = require('./components/queue.js');
var TrackHelper = require('./components/trackhelper.js');
var WordService = require('./components/wordservice.js');
var WeatherService = require('./components/weatherservice.js');

var commands = {
  'm!video': {
    execute: getVideo,
    description: 'Получить видео с YouTube по поисковому слову'
  },
  'm!weather': {
    execute: getWeather,
    description: 'Получить текущую погоду для данного города, по умолчанию Стокгольм'
  },
  'm!roll': {
    execute: roll,
    description: 'Рулон от 1 до 100'
  },
  'm!help': {
    execute: showHelp
  },
  'm!words': {
    execute: countWordsByUser,
    description: 'Получить самые популярные слова для пользователя данного имени пользователя, по умолчанию используется ваше имя пользователя'
  },
  'm!play': {
    execute: doQueue,
    description: 'Сыграть свою песню'
  },
  'm!skip': {
    execute: voteSkip,
    description: 'Пропустить текущую песню'
  },
  'm!song': {
    execute: showSong,
    description: 'Получить текущую песню'
  }
};

Bot.on('ready', () => {
	console.log("bots launching");
	console.log("loading discord.js");
	console.log("loading config");
	console.log("loaded discord.js");
	console.log("loaded config");
	console.log("bots launched...");
	Bot.user.setStatus('invisible');
	Bot.user.setStatus('online');
	Bot.user.setGame('type !help');
	console.log("status seted or error!");
	Bot.user.setUsername('MusicBot');
	console.log("Nick seted or error!");
});

Bot.on('message', message => {
  WordService.registerMessage(message);

  if (isBotCommand(message)) {
    execute(message.content, message);
  }
});

function showSong(args, message) {
  Queue.showSong(message);
}

function voteSkip(args, message) {
  Queue.voteSkip(message);
}

function doQueue(args, message) {
  if (args.length <= 0) {
    return message.reply(Helper.wrap('Сделайте сслыку музыки, например https://www.youtube.com/watch?v=ih2xubMaZWI'));
  }

  if (Queue.isFull()) {
    return message.reply(Helper.wrap('Список уже полный.'));
  }

  if (args.startsWith('http')) {
    TrackHelper.getVideoFromUrl(args).then(track => {
      Queue.add(track, message);
    }).catch(err => {
      message.reply(Helper.wrap(err));
    });
  } else {
    TrackHelper.getRandomTrack(args, 5).then(track => {
      Queue.add(track, message);
    }).catch(err => {
      message.reply(Helper.wrap(err));
    });
  }
}

function getVideo(args, message) {
  TrackHelper.getRandomTrack(args, 5).then(track => {
    message.reply(track.url);
  }).catch(err => {
    message.reply(Helper.wrap(err));
  });
}

function countWordsByUser(args, message) {
  WordService.countWordsByUser(args, message);
}

function getWeather(args, message) {
  WeatherService.getWeather(args, message);
}

function showHelp(args, message) {
  var toReturn = 'Нет команды чтобы запустить!';
  if (Object.keys(commands).length > 1) {
    var toReturn = 'Доступные команды:\n';
    for (var command in commands) {
      if (command != 'm!help') {
        data = commands[command];
        toReturn += command + ': ' + data.description + getAvailableCommandAsText(data) + '\n';
      }
    }
  }
  message.reply(Helper.wrap(toReturn));
}

function getAvailableCommandAsText(command) {
  if (!Helper.commandIsAvailable(command)) return ' (Не доступно)';

  return '';
}

function roll(content, message) {
  message.reply(Helper.wrap('На roll ' + getRandomNumber(1, 100) + ' (1-100)'));
}

function isBotCommand(message) {
  if (message.content.startsWith('m!') && message.author.id != Bot.user.id) {
    return true;
  }

  return false;
}

function execute(content, message) {
  var args = content.split(" ");
  var command = commands[args[0]];
  if (command) executeCommand(command, message, args);
}

function executeCommand(command, message, args) {
  if (!Helper.commandIsAvailable(command)) {
    return message.reply(Helper.wrap('Команда не доступен.'));
  }

  command.execute(getCommandArguments(args), message);
}

function getCommandArguments(args) {
  var withoutCommand = args.slice(1);

  return withoutCommand.join(" ");
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function registerService(service, affectedCommands) {
  service = new service();

  if (affectedCommands) {
    affectedCommands.forEach(command => {
      var c = commands[command];
      if (c) {
        if (!c.services) c.services = [];
        c.services.push(service);
      }
    });
  }

  return service;
}

function init() {
  Helper.keys('apikeys', ['discord']).then(keys => {
    Bot.login(keys.discord);

    Queue = registerService(Queue, ['m!play', 'm!skip', 'm!song']);
    TrackHelper = registerService(TrackHelper, ['m!play', 'm!video']);
    WordService = registerService(WordService, ['m!words']);
    WeatherService = registerService(WeatherService, ['m!weather']);
  }).catch(console.error);
}

init();
