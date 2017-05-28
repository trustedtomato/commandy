import {Program} from './index';
import {twist,flattenMapKeys,withoutPrefix,split,squeezePairs,mapToObj} from './helper-functions';


export namespace Input{
	export interface Argument{
		type:('required' | 'optional')
		name:string
	}

	export interface Option{
		appearances:string[]
		argument:Argument|null
		inheritance:boolean
		description:string
	}

	export class ProgramConfig{
		program:Program
		args:Argument[] = []
		description:string = ''
		commands:Map<string,ProgramConfig> = new Map()
		options:Option[] = []
	}
}


/*--- output ---*/
export namespace ParsingErrors{
	export class ParsingError{
		type:string
		constructor(){
			this.type = this.constructor.name;
		}
	}
	export class ShortOptionWithValueCannotBeCombined extends ParsingError{
		plainCombinedOptions:string
		wrongOption:Input.Option
		constructor(plainCombinedOptions:string,wrongOption:Input.Option){
			super();
			this.plainCombinedOptions = plainCombinedOptions;
			this.wrongOption = wrongOption;
		}
	}
	export class MissingArguments extends ParsingError{
		readonly requiredArgs:string[]
		readonly givenArgs:string[]
		constructor(requiredArgs:string[],givenArgs:string[]){
			super();
			this.requiredArgs = requiredArgs;
			this.givenArgs = givenArgs;
		}
	}
	export class MissingOptionValue extends ParsingError{
		readonly rawOption:string
		readonly option:Input.Option
		constructor(plainOption:string,option:Input.Option){
			super();
			this.rawOption = plainOption;
			this.option = option;
		}
	}
}
export namespace ParsingWarnings{
	export class ParsingWarning{
		type:string
		constructor(){
			this.type = this.constructor.name;
		}
	}
	export class InvalidOption extends ParsingWarning{
		readonly rawOption:string
		constructor(rawOption:string){
			super();
			this.rawOption = rawOption;
		}
	}
	export class TooManyArguments extends ParsingWarning{
		readonly args:Input.Argument[]
		readonly givenArgs:string[]
		constructor(args:Input.Argument[],givenArgs:string[]){
			super();
			this.args = args;
			this.givenArgs = givenArgs;
		}
	}
}


export interface Result{
	program:Program
	options:{
		[option: string]:(string|boolean)[]
	}
	arguments:{
		[property: string]:string
	}
	errors:ParsingErrors.ParsingError[]
	warnings:ParsingWarnings.ParsingWarning[]
}


/*--- actual logic ---*/
const parseCommands = (argvsAndCommands:string[],programConfig:Input.ProgramConfig,inheritedOptions:Input.Option[] = []):{
	programConfig: Input.ProgramConfig,
	argvs: string[],
	inheritedOptions: Input.Option[]
} => {
	if(argvsAndCommands.length <= 0)
		return {programConfig,argvs: argvsAndCommands,inheritedOptions};
	
	const firstArgOrCommand = argvsAndCommands[0];
	const matchingCommand = programConfig.commands.get(firstArgOrCommand);
	if(typeof matchingCommand === 'undefined')
		return {programConfig,argvs: argvsAndCommands,inheritedOptions};
	
	const inheritingOptions = programConfig.options.filter(_option => _option.inheritance===true);
	return parseCommands(argvsAndCommands.slice(1),matchingCommand,inheritingOptions);
};

const getAvailableOptionAppearances = (options:Input.Option[]) =>
	flattenMapKeys<string,Input.Option>(twist(options,'appearances'));

const parseOptions = (argvs:string[],availableOptions:Input.Option[]) => {
	const errors:ParsingErrors.ParsingError[] = [];
	const warnings:ParsingWarnings.ParsingWarning[] = [];
	const parsedOptions:[Input.Option,string|boolean][] = [];
	const args = [];

	const availableOptionAppearances = getAvailableOptionAppearances(availableOptions);

	const len = argvs.length;
	for(let i = 0; i < len; i++){
		if(!argvs[i].startsWith('-')){
			args.push(argvs[i]);
			continue;
		}

		let argv = argvs[i], value:(string|true) = true;
		if(argv.includes('=')){
			[argv,value] = split(argv,'=',2);
		}

		const options =
			!argv.startsWith('--') && argv.length>2
			? argv.replace('-','').split('').map(optionName => '-'+optionName)
			: [argv];

		let usedNextArgv = false;
		optionLoop: for(const option of options){
			const _option = availableOptionAppearances.get(option);
			if(typeof _option === 'undefined'){
				warnings.push(new ParsingWarnings.InvalidOption(option));
				continue optionLoop;
			}
			if(typeof value !== 'string' && _option.argument && _option.argument.type==='required'){
				if(typeof argvs[i+1] === 'undefined'){
					errors.push(new ParsingErrors.MissingOptionValue(option,_option));
				}else{
					usedNextArgv = true;
					value = argvs[i+1];
				}
			}
			parsedOptions.push([_option,value]);
		}
		if(usedNextArgv){
			i++;
		}
	}
	return{
		errors,
		warnings,
		args,
		options: parsedOptions
	}
};
const parseArgs = (args:string[],configArgs:Input.Argument[]) => {
	const errors:ParsingErrors.ParsingError[] = [];
	const warnings:ParsingWarnings.ParsingWarning[] = [];
	
	if(args.length > configArgs.length){
		warnings.push(new ParsingWarnings.TooManyArguments(configArgs,args));
	}
	let requiredArgs = configArgs.filter((configArg) => configArg.type==='required');
	if(requiredArgs.length > args.length){
		errors.push(new ParsingErrors.MissingArguments(requiredArgs.map(_requiredArg => _requiredArg.name),args));
	}
	let numberOfFillableOptionalArgs = args.length - requiredArgs.length;
	const argumentObject:{[key:string]:string} = {};
	let argI = 0;
	argLoop: for(let configArg of configArgs){
		if(typeof args[argI] === 'undefined') break argLoop;
		if(configArg.type==='optional'){
			if(numberOfFillableOptionalArgs<=0){
				continue;
			}else{
				numberOfFillableOptionalArgs--;
			}
		}
		argumentObject[configArg.name] = args[argI];
		argI++;
	}
	return{
		errors,
		warnings,
		argumentObject
	}
};
export const parseArgvs = (argvsAndCommands:string[],baseProgramConfig:Input.ProgramConfig):Result => {
	const {argvs,programConfig,inheritedOptions} = parseCommands(argvsAndCommands,baseProgramConfig);
	const {options,args,errors: optionErrors,warnings: optionWarnings} = parseOptions(argvs,programConfig.options.concat(inheritedOptions));	
	const {argumentObject,errors: argumentErrors,warnings: argumentWarnings} = parseArgs(args,programConfig.args);
	
	const errors = optionErrors.concat(argumentErrors);
	const warnings = optionWarnings.concat(argumentWarnings);

	const optionMap = squeezePairs(options);
	const appearanceMap = new Map([...flattenMapKeys(new Map(
		[...twist([...optionMap],'0 appearances')]
			.map(([appearances,[option,value]]):[string[],(string|boolean)[]] =>
				[appearances,value]
			)
	))]
		.filter(([appearance]) => appearance.startsWith('--'))
		.map(x => {
			x[0] = x[0].replace('--','');
			return x;
		}));

	return{
		program: programConfig.program,
		options: mapToObj(appearanceMap),
		arguments: argumentObject,
		errors,
		warnings
	}	
};