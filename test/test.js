const assert = require('assert');
const {createProgram,ParsingErrors,ParsingWarnings} = require('..');

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
				createProgram()
					.option('-f, -force');
			});
		});
		it('fully invalid option (f, --force)',function(){
			doesError(() => {
				createProgram()
					.option('f, --force');
			});
		});
	});
});

describe('Option parsing',function(){
	const program = createProgram()
		.option('-h, --help','show help',true)
		.option('-V, --version','show version',true);
	
	it('should parse one single dash option',function(){
		assert.deepStrictEqual(
			program.parse(['-h']),
			{
				program,
				commandChain:'',
				arguments:{},
				options: {help: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should parse multiple single dash options (separately)',function(){
		assert.deepStrictEqual(
			program.parse(['-V','-h']),
			{
				program,
				commandChain:'',
				arguments:{},
				options: {help: true,version: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should parse multiple single dash options (together)',function(){
		assert.deepStrictEqual(
			program.parse(['-hV']),
			{
				program,
				commandChain:'',
				arguments:{},
				options: {help: true,version: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should parse one two dash option',function(){
		assert.deepStrictEqual(
			program.parse(['--help']),
			{
				program,
				commandChain:'',
				arguments:{},
				options: {help: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should parse multiple two dash options',function(){
		assert.deepStrictEqual(
			program.parse(['--help','--version']),
			{
				program,
				commandChain:'',
				arguments:{},
				options: {help: true,version: true},
				errors: [],
				warnings: []
			}
		);
	});

	/*
	it('should error on unknown option',function(){
		doesError(() => {
			program.parse(['--unknownoption']);
		});
	});
	*/

	const program2 = createProgram()
		.option('-a, --apple <apple-type>','type of the apple')
		.option('-b, --banana <banana-type>','type of the banana');

	it('should parse option value done by equal sign',function(){
		assert.deepStrictEqual(
			program2.parse(['-a=red']),
			{
				program: program2,
				commandChain:'',
				arguments:{},
				options: {apple:'red'},
				errors: [],
				warnings: []
			}
		);
	});

	it('should send two "ParsingErrors.ShortOptionWithValueCannotBeCombined" erorrs on two one dash options are together & both of them needs a value',function(){
		assert(program2.parse(['-ab','red']).errors.length,2);
		assert(program2.parse(['-ab','red']).errors.every(error => {
			return error instanceof ParsingErrors.ShortOptionWithValueCannotBeCombined;
		}));
	});

	it('should send "ParsingErrors.MissingOptionValue" erorr when the option needs value but there is no value',function(){
		assert(program2.parse(['--apple']).errors.length,1);
		assert(program2.parse(['--apple']).errors[0] instanceof ParsingErrors.MissingOptionValue);
	});
});

describe('Command parsing',() => {
	
	const subSubProgram = createProgram('[comm]')
		.option('-h, --help');

	const subProgram = createProgram()
		.option('-h, --help')
		.command('command-lvl-2',subSubProgram);

	const program = createProgram()
		.command('command-lvl-1',subProgram);
	
	it('should parse multi-level command',function(){
		assert.deepStrictEqual(
			program.parse(['command-lvl-1','command-lvl-2','cheese']),
			{
				program: subSubProgram,
				commandChain:'command-lvl-1 command-lvl-2',
				arguments:{comm: 'cheese'},
				options: {},
				errors: [],
				warnings: []
			}
		);
	});

	it('should parse option before a command',function(){
		assert.deepStrictEqual(
			program.parse(['command-lvl-1','--help','command-lvl-2']),
			{
				program: subSubProgram,
				commandChain:'command-lvl-1 command-lvl-2',
				arguments:{},
				options: {help: true},
				errors: [],
				warnings: []
			}
		);
	});
});

describe('Argument precedence',function(){
	const testProgram = createProgram('<opt1> [opt2] <opt3>')
		.option('-h, --help',true)
		.option('-V, --version',true);

	const program = createProgram()
		.command('test',testProgram)

	it('should have the required arguments first',function(){
		assert.deepStrictEqual(
			program.parse(['test','a','b']),
			{
				program: testProgram,
				commandChain: 'test',
				arguments:{
					opt1: 'a',
					opt3: 'b'
				},
				options: {},
				errors: [],
				warnings: []
			}
		);
	});

	it('should be able to add the optional argument to the middle if present',function(){
		assert.deepStrictEqual(
			program.parse(['test','a','b','c']),
			{
				program: testProgram,
				commandChain: 'test',
				arguments:{
					opt1: 'a',
					opt2: 'b',
					opt3: 'c'
				},
				options: {},
				errors: [],
				warnings: []
			}
		);
	});

	it('should not error when there is a lazy option but the aruments are not enough',function(){
		assert.deepStrictEqual(
			program.parse(['test','--help']),
			{
				program: testProgram,
				commandChain: 'test',
				arguments: {},
				options: {help: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should not error when there are lazy options but the aruments are not enough',function(){
		assert.deepStrictEqual(
			program.parse(['test','-hV']),
			{
				program: testProgram,
				commandChain: 'test',
				arguments: {},
				options: {help: true, version: true},
				errors: [],
				warnings: []
			}
		);
	});

	it('should send an error when there is no lazy option and the aruments are not enough',function(){
		assert(
			program.parse(['test','a']).errors.length===1 &&
			program.parse(['test','a']).errors[0] instanceof ParsingErrors.MissingArguments
		)
	});
});