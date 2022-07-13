import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { EmailService } from 'src/email/email.service';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersService } from './users.service';
import { Repository } from 'typeorm';

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});
const mockVerifyRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn(() => 'signed-token'),
  verify: jest.fn(),
});

const mockEmailService = () => ({
  sendVerificationEmail: jest.fn(),
});

type mockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: mockRepository<User>;
  let verificationsRepository: mockRepository<Verification>;
  let emailService: EmailService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockVerifyRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: EmailService,
          useValue: mockEmailService(),
        },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
    emailService = module.get<EmailService>(EmailService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: '',
      password: '',
      role: 0,
    };
    const createVerification = {
      code: '',
      user: createAccountArgs,
    };

    it('should fail if user exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: '123@naver.com',
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject([
        false,
        'There is a user with that email already.',
      ]);
    });

    it('should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockReturnValue(createAccountArgs);
      verificationsRepository.create.mockReturnValue(createVerification);
      verificationsRepository.save.mockReturnValue(createVerification);
      const result = await service.createAccount(createAccountArgs);
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);
      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      });
      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith(
        createVerification,
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
      );
      expect(result).toMatchObject([true]);
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(result).toEqual([false, "Couldn't create account"]);
    });
  });

  describe('logIn', () => {
    const loginArgs = {
      email: '',
      password: '',
    };
    it('should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.logIn(loginArgs);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({
        ok: false,
        error: 'User Not Found.',
      });
    });

    it('should fail if the password is wrong', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.logIn(loginArgs);
      expect(result).toEqual({ ok: false, error: 'Wrong Password' });
    });

    it('should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      };
      usersRepository.findOne.mockResolvedValue(mockedUser);
      const result = await service.logIn(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toEqual({ ok: true, token: 'signed-token' });
    });
  });

  describe('findById', () => {
    it('should find an existing user', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 1 });
      const result = await service.findById(1);
      expect(result).toEqual({ ok: true, user: { id: 1 } });
    });

    it('should fail if no user if found.', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.findById(1);
      expect(result).toEqual({
        ok: false,
        error: 'User Not Found.',
      });
    });
  });

  describe('editProfile', () => {
    it('should change email', async () => {
      const oldUser = {
        email: 'test@old.com',
        emailVerified: true,
      };
      const editProfileArgs = {
        userId: 1,
        input: { email: 'test@new.com' },
      };
      const newVerification = {
        code: 'code',
      };
      const newUser = {
        emailVerified: false,
        email: editProfileArgs.input.email,
      };

      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationsRepository.create.mockReturnValue(newVerification);
      verificationsRepository.save.mockResolvedValue(newVerification);

      await service.editProfile(editProfileArgs.userId, editProfileArgs.input);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: editProfileArgs.userId },
      });

      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: newUser,
      });
      expect(verificationsRepository.save).toHaveBeenCalledWith(
        newVerification,
      );

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code,
      );
    });

    it('should change password', async () => {
      const editProfileArgs = {
        userId: 1,
        input: { password: 'newPassword' },
      };
      usersRepository.findOne.mockResolvedValue({ password: 'oldPassowrd' });
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(editProfileArgs.input);
      expect(result).toEqual({
        ok: true,
      });
    });

    it('should not change email', async () => {
      const oldUser = {
        email: 'test@old.com',
        emailVerified: true,
      };
      const editProfileArgs = {
        userId: 1,
        input: { email: 'test@old.com' },
      };

      usersRepository.findOne.mockResolvedValue(oldUser);

      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input,
      );

      expect(result).toEqual({
        ok: false,
        error: 'This email already exists.',
      });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.editProfile(1, { email: '123' });
      expect(result).toEqual({
        ok: false,
        error: 'Could not update profile.',
      });
    });
  });

  describe('verifyEmail', () => {
    it('sould verify email', async () => {
      const mockedVerification = {
        id: 1,
        user: {
          emailVerified: false,
        },
      };
      verificationsRepository.findOne.mockResolvedValue(mockedVerification);

      const result = await service.verifyEmail('code');

      expect(verificationsRepository.findOne).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith({
        emailVerified: true,
      });
      expect(verificationsRepository.delete).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id,
      );
      expect(result).toEqual({ ok: true });
    });
    it('should fail on verification not found', async () => {
      verificationsRepository.findOne.mockResolvedValue(undefined);
      const result = await service.verifyEmail('');
      expect(result).toEqual({ ok: false, error: 'verification not found.' });
    });
  });
});
