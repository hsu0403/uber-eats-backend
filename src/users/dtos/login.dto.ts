import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';
import { User } from '../entities/user.entity';

@InputType()
export class LogInInput extends PickType(User, ['email', 'password']) {}

@ObjectType()
export class LogInOutput extends CoreOutput {
  @Field(() => String, { nullable: true })
  token?: string;
}
