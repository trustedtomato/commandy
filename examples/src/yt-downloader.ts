declare const console:any, process:any;
import {createProgram,ParsingErrors} from '../..';

const trackProgram = createProgram('<url>')
	.option('-f, --force');

const playlistProgram = createProgram('<url>')
	.option('-a, --artist <artist-name>')
	.option('-A, --album <album-name>')
	.option('-f, --force');

const mainProgram = createProgram()
	.command('track',trackProgram)
	.command('playlist',playlistProgram);

const input = mainProgram.parse(process.argv.slice(2));

if(input.program===playlistProgram){
	console.log('Playlist url: '+input.arguments.url);
	if(input.options.force){
		console.log('Forcing!');
	}
	if(input.options.artist){
		console.log('Default artist: '+input.options.artist);
	}
	if(input.options.album){
		console.log('Album: '+input.options.album);
	}
}else{
	console.log('Not a playlist!');
}