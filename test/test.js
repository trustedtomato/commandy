const assert = require('assert');
const {Program} = require('..');

function doesError(func){
	assert((function(){
		try{
			func();
			return false;
		}catch(err){
			return true;
		}
	}()));
}

const basicProgram = new Program([
	['h', 'help'],
	['v', 'version']
]);

const abc = new Program([
	['a', 'aligator'],
	['b', 'blobfish'],
	['c', 'cat']
],['a']);

test('aliases', () => {
	const help = basicProgram.parse(['-h']);
	const version = basicProgram.parse(['--version']);

	expect(help.options.help).toEqual([true]);
	expect(version.options.v).toEqual([true]);
	expect(help.options.version).toEqual([]);
});

test('option values', () => {
	const abch = abc.parse(['--aligator','green','-b=bleaou!','--cat','cute']);

	expect(abch.options.aligator).toEqual(['green']);
	expect(abch.options.b).toEqual(['bleaou!']);
	expect(abch.options.cat).toEqual([true]);
	expect(abch.args).toEqual(['cute']);
});

test('option value with alias', () => {
	const abch = abc.parse(['--aligator','green','-b=bleaou!','--cat','cute']);

	expect(abch.options.a).toEqual(['green']);
	expect(abch.options.blobfish).toEqual(['bleaou!']);
	expect(abch.options.c).toEqual([true]);
});

test('grouped options\' values', () => {
	const abch = abc.parse(['-ab','green','-bc=bleaou!','-bc','cute','-ab=aww!']);

	expect(abch.options.aligator).toEqual(['green','aww!']);
	expect(abch.options.blobfish).toEqual(['green','bleaou!',true,'aww!']);
	expect(abch.options.cat).toEqual(['bleaou!',true]);
	expect(abch.args).toEqual(['cute']);
});