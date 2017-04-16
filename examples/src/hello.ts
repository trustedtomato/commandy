declare const console:any, process:any;
import {createProgram} from '../..';

const program = createProgram('<name>');

const input = program.parse(process.argv.slice(2));
console.log('Hello '+input.arguments.name+'!');