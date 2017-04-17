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



const basicProgram = createProgram()
	.option('-h, --help','show help',true)
	.option('-V, --version','show version',true);

const programWithManyOptions = createProgram()
	.option('-a, --apple <apple-type>','type of the apple')
	.option('-b, --banana <banana-type>','type of the banana')
	.option('-c, --coconut [coconut-type]','type of the coconut');

const subSubProgram = createProgram('[comm]')
	.option('-h, --help');

const subProgram = createProgram()
	.option('-h, --help')
	.command('command-lvl-2',subSubProgram);

const subbyProgram = createProgram()
	.command('command-lvl-1',subProgram);

const argumentProgram = createProgram('<opt1> [opt2] <opt3>')
	.option('-h, --help',true)
	.option('-V, --version',true);

const mainArgumentProgram = createProgram()
	.command('test',argumentProgram)



describe('Program definer error cases',function(){
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

describe('Program user error & warning cases',function(){
	it('should send two erorrs when there are two one dash options are together & both of them needs a value',function(){
		const parsed = programWithManyOptions.parse(['-ab','red']);
		assert(parsed.errors.length===2 && parsed.errors.every(error =>
			error instanceof ParsingErrors.ShortOptionWithValueCannotBeCombined
		));
	});
	
	it('should send erorr when the option needs value but there is no value',function(){
		const parsed = programWithManyOptions.parse(['--apple']);
		assert(parsed.errors.length===1 && parsed.errors[0] instanceof ParsingErrors.MissingOptionValue);
	});

	it('should warn on unknown option',function(){
		const parsed = basicProgram.parse(['--unknownoption']);
		assert(parsed.warnings.length===1 && parsed.warnings[0] instanceof ParsingWarnings.InvalidOption);
	});

	it('should send an error when there is no lazy option and the aruments are not enough',function(){
		const parsed = mainArgumentProgram.parse(['test','a']);
		assert(
			parsed.errors.length===1 &&
			parsed.errors[0] instanceof ParsingErrors.MissingArguments
		)
	});

	it('should warn if there are too many arguments',function(){
		const parsed = mainArgumentProgram.parse(['test','a',',b','c','d']);
		assert(
			parsed.warnings.length===1 &&
			parsed.warnings[0] instanceof ParsingWarnings.TooManyArguments
		)
	});
});

describe('Option parsing',function(){
	it('should parse one single dash option',function(){
		assert(basicProgram.parse(['-h']).options.help===true);
	});

	it('should parse multiple single dash options (separately)',function(){
		const parsed = basicProgram.parse(['-V','-h']);
		assert(parsed.options.help===true && parsed.options.version===true);
	});

	it('should parse multiple single dash options (together)',function(){
		const parsed = basicProgram.parse(['-hV']);
		assert(parsed.options.help===true && parsed.options.version===true);
	});

	it('should parse one two dash option',function(){
		assert(basicProgram.parse(['--help']).options.help===true);
	});

	it('should parse multiple two dash options',function(){
		const parsed = basicProgram.parse(['--help','--version']);
		assert(parsed.options.help===true && parsed.options.version===true);
	});
	
	it('should parse option value done by space if the value is required',function(){
		assert(programWithManyOptions.parse(['-a','red']).options.apple==='red');
	});

	it('should not parse option value done by space if the value is optional',function(){
		assert(programWithManyOptions.parse(['-c','blue']).options.coconut!=='blue');
	});

	it('should parse option value done by equal sign',function(){
		assert(programWithManyOptions.parse(['-a=red']).options.apple==='red');
	});

	it('should not error when there is a lazy option but the aruments are not enough',function(){
		const parsed = mainArgumentProgram.parse(['test','--help']);
		assert(parsed.options.help===true && parsed.errors.length===0 && parsed.warnings.length===0);
	});

	it('should not error when there are (multiple) lazy options but the aruments are not enough',function(){
		const parsed = mainArgumentProgram.parse(['test','-hV']);
		assert(parsed.options.help===true && parsed.options.version===true);
	});
});

describe('Command parsing',() => {
	it('should parse multi-level command',function(){
		const parsed = subbyProgram.parse(['command-lvl-1','command-lvl-2','cheese']);
		assert(
			parsed.program===subSubProgram &&
			parsed.commandChain==='command-lvl-1 command-lvl-2' &&
			parsed.arguments.comm==='cheese'
		);
	});

	it('should parse option before a command',function(){
		const parsed = subbyProgram.parse(['command-lvl-1','--help','command-lvl-2']);
		assert(
			parsed.program===subSubProgram &&
			parsed.commandChain==='command-lvl-1 command-lvl-2' &&
			parsed.options.help===true
		);
	});
});

describe('Argument precedence',function(){
	it('should have the required arguments first',function(){
		const parsed = mainArgumentProgram.parse(['test','a','b']);
		assert(parsed.arguments.opt1==='a' && parsed.arguments.opt3==='b');
	});

	it('should be able to add the optional argument to the middle if present',function(){
		const parsed = mainArgumentProgram.parse(['test','a','b','c']);
		assert(parsed.arguments.opt1==='a' && parsed.arguments.opt2==='b' && parsed.arguments.opt3==='c');
	});
});