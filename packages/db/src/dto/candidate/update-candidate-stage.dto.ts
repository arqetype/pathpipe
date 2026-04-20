import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CandidateStage } from '../../types/candidate/stage';

export class UpdateCandidateStageDto {
  @IsString()
  id: string;

  @IsOptional()
  @IsEnum(CandidateStage)
  stage?: CandidateStage;
}
