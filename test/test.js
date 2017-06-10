const assert = require('assert');
const {createProgram} = require('..');

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
	.option('-h, --help',{inheritance: true})
	.option('-V, --version',{inheritance: true});

const programWithManyOptions = createProgram()
	.option('-a, --apple <apple-type>')
	.option('-b, --banana <banana-type>')
	.option('-c, --coconut [coconut-type]');

const subSubProgram = createProgram('[comm]')
	.option('-h, --help');

const subProgram = createProgram()
	.option('-h, --help')
	.command('command-lvl-2',subSubProgram);

const subbyProgram = createProgram()
	.command('command-lvl-1',subProgram);

const argumentProgram = createProgram('<opt1> [opt2] <opt3>')
	.option('-h, --help',{inheritance: true})
	.option('-V, --version',{inheritance: true});

const mainArgumentProgram = createProgram()
	.command('test',argumentProgram);

const inheritanceProgram = createProgram()
	.option('-h, --help',{inheritance: true})
	.option('-b, --banana',{inheritance: true})
	.option('-d, --dingdong')
	.command('test',programWithManyOptions)



describe('it should error on',function(){
	describe('invalid option syntax definition:',function(){
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
	it('should send erorr when the option needs value but there is no value',function(){
		const parsed = programWithManyOptions.parse(['--apple']);
		assert(parsed.errors.length===1 && parsed.errors[0].type==='MissingOptionValue');
	});

	it('should warn on unknown option',function(){
		const parsed = basicProgram.parse(['--unknownoption']);
		assert(parsed.warnings.length===1 && parsed.warnings[0].type==='InvalidOption');
	});

	it('should send an error when the arguments are not enough',function(){
		const parsed = mainArgumentProgram.parse(['test','a']);
		assert(
			parsed.errors.length===1 &&
			parsed.errors[0].type==='MissingArguments'
		)
	});

	it('should warn if there are too many arguments',function(){
		const parsed = mainArgumentProgram.parse(['test','a',',b','c','d']);
		assert(
			parsed.warnings.length===1 &&
			parsed.warnings[0].type==='TooManyArguments'
		)
	});
});

describe('Options should be parsed correctly when',function(){
	it('there is no option - it should still make the arrays',function(){
		assert(programWithManyOptions.parse([]).options.apple.length===0);
	});

	it('they are single dashed',function(){
		assert(basicProgram.parse(['-h']).options.help[0]===true);
	});

	it('they are single dashed (multiple, separately)',function(){
		const parsed = basicProgram.parse(['-V','-h']);
		assert(parsed.options.help[0]===true && parsed.options.version[0]===true);
	});

	it('they are single dashed (multiple, together)',function(){
		const parsed = basicProgram.parse(['-hV']);
		assert(parsed.options.help[0]===true && parsed.options.version[0]===true);
	});

	it('they are two dashed',function(){
		assert(basicProgram.parse(['--help']).options.help[0]===true);
	});

	it('they are two dashed (multiple)',function(){
		const parsed = basicProgram.parse(['--help','--version']);
		assert(parsed.options.help[0]===true && parsed.options.version[0]===true);
	});
	
	it('their value is required (next argv is its argument if there is no equal sign)',function(){
		assert(programWithManyOptions.parse(['-a','red']).options.apple[0]==='red');
	});

	it('their value is done by space and the value is optional (it should not have it)',function(){
		assert(programWithManyOptions.parse(['-c','blue']).options.coconut[0]!=='blue');
	});

	it('their value is done by equal sign',function(){
		assert(programWithManyOptions.parse(['-a=red']).options.apple[0]==='red');
	});

	it('arguments are not enough, but should send an error ',function(){
		const parsed = mainArgumentProgram.parse(['test','--help']);
		assert(
			parsed.options.help[0]===true &&
			parsed.errors.length===1);
	});

	it('they are optional and there is no value & still give it the value of true because it\'s there',function(){
		const parsed = programWithManyOptions.parse(['-c']);
		assert(parsed.options.coconut[0]===true);
	});

	it('they are lazy options but the arguments are not enough (multiple)',function(){
		const parsed = mainArgumentProgram.parse(['test','-hV']);
		assert(parsed.options.help[0]===true && parsed.options.version[0]===true);
	});
});

describe('Command parsing',() => {
	it('should parse multi-level command',function(){
		const parsed = subbyProgram.parse(['command-lvl-1','command-lvl-2','cheese']);
		assert(
			parsed.program===subSubProgram &&
			parsed.arguments.comm==='cheese'
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

describe('Option inheritance',function(){
	it('should inherit options with "inheritance"',function(){
		const parsed = inheritanceProgram.parse(['test','-h']);
		assert(parsed.options.help[0]===true);
	});
	it('should not inherit options without "inheritance"',function(){
		const parsed = inheritanceProgram.parse(['test','-d']);
		assert(
			typeof parsed.options.dingdong === 'undefined' &&
			parsed.warnings.length===1
		);
	});
	it('the closer option should override the farther one (tho this feature shouldn\'t be really used)',function(){
		const parsed = inheritanceProgram.parse(['test','-b','nah']);
		assert(
			parsed.options.banana[0] === 'nah' &&
			parsed.warnings.length===0
		);
	});
});