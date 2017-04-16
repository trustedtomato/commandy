const assert = require('assert');
const Program = require('..').Program;

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

describe('Error cases',function(){
	describe('Invalid option syntax should be thrown on',function(){
		it('multi-letter one dash option (-f, -force)',function(){
			doesError(() => {
				const program = new Program();
				program
					.option('-f, -force');
			});
		});
		it('no option',function(){
			doesError(() => {
				const program = new Program();
				program
					.option();
			});
		});
		it('fully invalid option (f, --force)',function(){
			doesError(() => {
				const program = new Program();
				program
					.option('f, --force');
			});
		});
	});
});

describe('Option parsing',function(){
	const program = new Program();

	program
		.option('-h, --help','show help',true)
		.option('-V, --version','show version',true);
	
	
	it('should parse one single dash option',function(){
		assert.deepStrictEqual(
			program.parse(['-h']),
			{
				commandChain:'',
				arguments:{},
				options: {help: true}
			}
		);
	});

	it('should parse multiple single dash options (separately)',function(){
		assert.deepStrictEqual(
			program.parse(['-V','-h']),
			{
				commandChain:'',
				arguments:{},
				options: {help: true,version: true}
			}
		);
	});

	it('should parse multiple single dash options (together)',function(){
		assert.deepStrictEqual(
			program.parse(['-hV']),
			{
				commandChain:'',
				arguments:{},
				options: {help: true,version: true}
			}
		);
	});

	it('should parse one two dash option',function(){
		assert.deepStrictEqual(
			program.parse(['--help']),
			{
				commandChain:'',
				arguments:{},
				options: {help: true}
			}
		);
	});

	it('should parse multiple two dash options',function(){
		assert.deepStrictEqual(
			program.parse(['--help','--version']),
			{
				commandChain:'',
				arguments:{},
				options: {help: true,version: true}
			}
		);
	});

	it('should error on unknown option',function(){
		doesError(() => {
			program.parse(['--unknownoption']);
		});
	});

	const program2 = new Program();

	program2
		.option('-a, --apple <apple-type>','type of the apple')
		.option('-b, --banana <banana-type>','type of the banana');

	it('should parse option value done by equal sign',function(){
		assert.deepStrictEqual(
			program2.parse(['-a=red']),
			{
				commandChain:'',
				arguments:{},
				options: {apple:'red'}
			}
		);
	});

	it('should error on multiple one dash option where one of them needs an argument',function(){
		doesError(() => {
			program2.parse(['-ab','red']);
		});
	});
});

describe('Command parsing',() => {
	const program = new Program();
	
	program
		.command('command-lvl-1')
		.option('-h, --help')
			.command('command-lvl-2 [comm]')
			.option('-h, --help');
	
	it('should parse multi-level command',function(){
		assert.deepStrictEqual(
			program.parse(['command-lvl-1','command-lvl-2','cheese']),
			{
				commandChain:'command-lvl-1 command-lvl-2',
				arguments:{comm: 'cheese'},
				options: {}
			}
		);
	});

	it('should parse option before a command',function(){
		assert.deepStrictEqual(
			program.parse(['command-lvl-1','--help','command-lvl-2']),
			{
				commandChain:'command-lvl-1 command-lvl-2',
				arguments:{},
				options: {help: true}
			}
		);
	});
});

describe('Argument precedence',function(){
	const program = new Program();

	program
		.command('test <opt1> [opt2] <opt3>')
		.option('-h, --help',true)
		.option('-V, --version',true);

	it('should have the required arguments first',function(){
		assert.deepStrictEqual(
			program.parse(['test','a','b']),
			{
				commandChain: 'test',
				arguments:{
					opt1: 'a',
					opt3: 'b'
				},
				options: {}
			}
		);
	});

	it('should be able to add the optional argument to the middle if present',function(){
		assert.deepStrictEqual(
			program.parse(['test','a','b','c']),
			{
				commandChain: 'test',
				arguments:{
					opt1: 'a',
					opt2: 'b',
					opt3: 'c'
				},
				options: {}
			}
		);
	});

	it('should not error when there is a lazy option but the aruments are not enough',function(){
		assert.deepStrictEqual(
			program.parse(['test','--help']),
			{
				commandChain: 'test',
				arguments: {},
				options: {help: true}
			}
		);
	});

	it('should not error when there are lazy options but the aruments are not enough',function(){
		assert.deepStrictEqual(
			program.parse(['test','-hV']),
			{
				commandChain: 'test',
				arguments: {},
				options: {help: true, version: true}
			}
		);
	});

	it('should error when there is no lazy option and the aruments are not enough',function(){
		doesError(() => {
			program.parse(['test','a']);
		});
	});
});