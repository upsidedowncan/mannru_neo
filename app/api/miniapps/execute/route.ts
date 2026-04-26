import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, updateUserBalance, createTransaction, createNotification, incrementVariable, setVariableState, getVariableState } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, amount, variableId, miniAppId, silent } = body;

    const user = await getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    switch (action) {
      case 'addMoney': {
        if (typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        const updatedUser = await updateUserBalance(session.userId, amount, 'add');
        if (!updatedUser) {
          return NextResponse.json({ error: 'Failed to add money' }, { status: 500 });
        }

        await createTransaction(
          'system',
          session.userId,
          amount,
          'deposit',
          'Мини-приложение: Добавление средств'
        );

        if (!silent) {
          await createNotification({
            userId: session.userId,
            type: 'deposit',
            title: 'Средства добавлены',
            message: `Мини-приложение добавило ${amount} МР на ваш счет`,
            amount,
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Добавлено ${amount} МР`,
          newBalance: updatedUser.balance 
        });
      }

      case 'removeMoney': {
        if (typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
        }

        if (user.balance < amount) {
          return NextResponse.json({ error: 'Недостаточно средств' }, { status: 400 });
        }

        const updatedUser = await updateUserBalance(session.userId, amount, 'subtract');
        if (!updatedUser) {
          return NextResponse.json({ error: 'Failed to remove money' }, { status: 500 });
        }

        await createTransaction(
          session.userId,
          'system',
          amount,
          'withdrawal',
          'Мини-приложение: Списание средств'
        );

        if (!silent) {
          await createNotification({
            userId: session.userId,
            type: 'withdrawal',
            title: 'Средства списаны',
            message: `Мини-приложение списало ${amount} МР с вашего счета`,
            amount,
          });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Списано ${amount} МР`,
          newBalance: updatedUser.balance 
        });
      }

      case 'incrementVar': {
        if (!variableId || !miniAppId) {
          return NextResponse.json({ error: 'Missing variableId or miniAppId' }, { status: 400 });
        }
        const incrementAmount = typeof amount === 'number' ? amount : 1;
        const newValue = await incrementVariable(session.userId, miniAppId, variableId, incrementAmount);
        return NextResponse.json({ 
          success: true, 
          message: silent ? '' : `Переменная увеличена на ${incrementAmount}`,
          newValue 
        });
      }

      case 'decrementVar': {
        if (!variableId || !miniAppId) {
          return NextResponse.json({ error: 'Missing variableId or miniAppId' }, { status: 400 });
        }
        const decrementAmount = typeof amount === 'number' ? amount : 1;
        const newValue = await incrementVariable(session.userId, miniAppId, variableId, -decrementAmount);
        return NextResponse.json({ 
          success: true, 
          message: silent ? '' : `Переменная уменьшена на ${decrementAmount}`,
          newValue 
        });
      }

      case 'setVar': {
        if (!variableId || !miniAppId) {
          return NextResponse.json({ error: 'Missing variableId or miniAppId' }, { status: 400 });
        }
        const setValue = typeof amount === 'number' ? amount : 0;
        await setVariableState(session.userId, miniAppId, variableId, setValue);
        return NextResponse.json({ 
          success: true, 
          message: silent ? '' : `Переменная установлена на ${setValue}`,
          newValue: setValue 
        });
      }

      case 'depositVar': {
        if (!variableId || !miniAppId) {
          return NextResponse.json({ error: 'Missing variableId or miniAppId' }, { status: 400 });
        }
        const variableValue = await getVariableState(session.userId, miniAppId, variableId);
        
        if (variableValue <= 0) {
          return NextResponse.json({ error: 'Переменная равна 0 или меньше' }, { status: 400 });
        }

        const updatedUser = await updateUserBalance(session.userId, variableValue, 'add');
        if (!updatedUser) {
          return NextResponse.json({ error: 'Failed to add money' }, { status: 500 });
        }

        await createTransaction(
          'system',
          session.userId,
          variableValue,
          'deposit',
          'Мини-приложение: Внесение по значению переменной'
        );

        if (!silent) {
          await createNotification({
            userId: session.userId,
            type: 'deposit',
            title: 'Средства добавлены',
            message: `Мини-приложение внесло ${variableValue} МР на ваш счет`,
            amount: variableValue,
          });
        }

        // Reset variable to 0 after deposit
        await setVariableState(session.userId, miniAppId, variableId, 0);

        return NextResponse.json({ 
          success: true, 
          message: silent ? '' : `Внесено ${variableValue} МР`,
          newBalance: updatedUser.balance,
          variableReset: true
        });
      }

      case 'transfer': {
        return NextResponse.json({ 
          error: 'Transfer requires recipient (not implemented in basic version)' 
        }, { status: 400 });
      }

      case 'custom': {
        return NextResponse.json({ 
          success: true, 
          message: 'Кастомное действие выполнено' 
        });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Execute error:', error);
    return NextResponse.json({ error: 'Failed to execute action' }, { status: 500 });
  }
}
