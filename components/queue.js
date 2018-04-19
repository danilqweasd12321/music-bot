var Helper = require('./helper.js');

var exports = {};

module.exports = Queue = function() {
  var vm = this;

  vm.skipVotes = [];
  vm.queue = [];
  vm.currentDispatcher = undefined;

  Helper.keys('queue', ['maxlen', 'skipmajority']).then(values => {
    vm.maxlen = values.maxlen;
    vm.skipmajority = values.skipmajority;
    vm.admins = ['409257766939656205'];
  }).catch(err => {
    console.log(err);
    vm.hasUnmetDepedencies = true;
  });
}

Queue.prototype.add = function(track, message) {
  this.queue.push(track);

  message.reply(Helper.wrap('Добавлен ' + track.title + ' на очереди. (number ' + (this.queue.indexOf(track) + 1) + ')'));

  if (this.queue.length == 1) {
    this.play(message);
  }
}

Queue.prototype.isFull = function() {
  return this.queue.length >= this.maxlen;
}

Queue.prototype.play = function(message) {
  var vm = this;
  var channel = getAuthorVoiceChannel(message);

  if (!channel) {
    vm.queue = [];
    return message.reply(Helper.wrap('У вас нет голосового канала.'));
  }

  var toPlay = vm.queue[0];
  if (!toPlay) {
    return message.reply(Helper.wrap('Нет песен в очереди.'));
  }

  channel.join().then(connection => {
    var stream = toPlay.stream();

    vm.currentDispatcher = connection.playStream(stream, {
      seek: 0,
      volume: 0.5
    });

    vm.currentDispatcher.on('end', event => {
      vm.remove(message);
    });

    vm.currentDispatcher.on('error', err => {
      vm.remove(message);
    });

    vm.skipVotes = [];
    message.channel.sendMessage(Helper.wrap('Сейчас играет: ' + toPlay.title));
  }).catch(console.error);
}

Queue.prototype.showSong = function(message) {
  var song = this.queue[0];

  if (song) {
    return message.reply(Helper.wrap('Сейчас играет: ' + song.title + '\n' + song.url));
  } else {
    return message.reply(Helper.wrap('В настоящий момент ни одна песня не воспроизводится.'));
  }
}

Queue.prototype.voteSkip = function(message) {
  var vm = this;
  var channel = getAuthorVoiceChannel(message);

  if (!vm.currentDispatcher) {
    return message.reply(Helper.wrap('В настоящий момент ни одна песня не воспроизводится.'));
  }

  if (vm.admins.includes(message.member.user.id)) {
    this.currentDispatcher.end();
    return message.reply(Helper.wrap('Конечно, сэр.'));
  }

  if (!channel) {
    return message.reply(Helper.wrap("Вам не разрешено проголосовать, поскольку вы не находитесь в канале."));
  }

  if (vm.skipVotes.indexOf(message.author.id) > -1) {
    return message.reply(Helper.wrap('Вы уже проголосовали, чтобы пропустить эту песню.'));
  }

  vm.skipVotes.push(message.author.id);

  var totalMembers = Helper.getTotalMembers(channel);

  if (vm.skipVotes.length / totalMembers >= vm.skipmajority) {
    this.currentDispatcher.end();
  } else {
    var votesNeeded = getAmountOfVotesNeeded(totalMembers, vm.skipVotes.length, vm.skipmajority);
    return message.reply(Helper.wrap('Тебе нужно ' + votesNeeded + ' больше голосов (ы), чтобы пропустить эту песню.'));
  }
}

Queue.prototype.remove = function(message) {
  this.queue.shift();
  var channel = message.member.voiceChannel;

  if (this.queue.length > 0) {
    this.play(message);
  } else {
    channel.leave();
    message.channel.sendMessage(Helper.wrap('Больше нет песен в очереди.'));
  }
}

function getAmountOfVotesNeeded(members, skipVotes, skipMajority) {
  var needed = 0;
  var skips = skipVotes;

  for (var i = 0; i < members; i++) {
    if (skips / members < skipMajority) {
      skips++;
      needed++;
    }
  }

  return needed;
}

function getAuthorVoiceChannel(message) {
	var voiceChannelArray = message.guild.channels.filter((v) => v.type == 'voice').filter((v) => v.members.exists('id', message.author.id)).array();

	if(voiceChannelArray.length <= 0) {
    return undefined;
  }

	return voiceChannelArray[0];
}
