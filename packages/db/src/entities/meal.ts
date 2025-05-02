import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";
import { User } from "./user";

@Entity()
export class Meal {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  description: string;

  @Column("numeric")
  calories: number;

  @Column("numeric")
  protein: number;

  @Column("numeric")
  carbs: number;

  @Column("numeric")
  fat: number;

  @Column()
  meal_date: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, (user) => user.meals)
  user: User;
}
