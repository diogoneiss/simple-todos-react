import React, { useState, useEffect } from 'react';
import { Button, TextField, FormControlLabel, Checkbox, Container, RadioGroup, Radio, FormControl, Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CenteredLoading from '../components/CenteredLoading';
import { Meteor } from 'meteor/meteor';
import { useParams } from 'react-router-dom';
import { useTracker } from 'meteor/react-meteor-data';
import { TasksCollection } from '/imports/db/TasksCollection';
import { taskStatuses } from '../../models/taskModel';
import ErrorDisplay from '../components/AlertComponent';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function TaskViewEdit() {
  const [task, setTask] = useState(null);
  const [originalTask, setOriginalTask] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };


  const handleStatusChange = (newStatus) => {
    setTask({ ...task, status: newStatus });
  };

  const { taskId } = useParams();

  const resetTask = () => {
    setTask(originalTask);
  }


  const { isLoading, subscriptionError } = useTracker(() => {
    console.log("Carregando subscription com id ", taskId)
    const subscription = Meteor.subscribe('task.byId', taskId, {
      onStop: (error) => {
        if (error) {
          console.error(`Aconteceu um erro na subscription: ${error.reason}`);
        }
      }
    });

    const taskData = TasksCollection.findOne(taskId);
    if (taskData) {
      setTask(taskData);
      setOriginalTask(taskData);
    }

    return {
      isLoading: !subscription.ready(),
      subscriptionError: subscription.error ? subscription.error.reason : null,
    };
  }, [taskId]);

  if (subscriptionError) return <div>Error: {subscriptionError}</div>;
  if (isLoading || !task) return <CenteredLoading />;


  const handleEditClick = () => {
    if (Meteor.userId() === task.userId) {
      setIsEditMode(true);
    }
  };

  const handleCancelClick = () => {
    if (Meteor.userId() === task.userId) {
      setIsEditMode(false);
      resetTask();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    Meteor.call('tasks.update', task, (error) => {
      if (error) {
        console.error(error);
        setError(error.error);
        setFeedback(null);
      } else {
        setIsEditMode(false);
        setError(null);
        setFeedback('Tarefa atualizada com sucesso!');
        setOriginalTask(task);
      }
    });
  };



  return (
    <Container component="main" maxWidth="xs">
      {error && <ErrorDisplay message={error} />}
      <TaskInfo task={task} />
      <form onSubmit={handleSubmit}>
        <TextField
          label="Título"
          variant="outlined"
          fullWidth
          margin="normal"
          value={task.title}
          disabled={!isEditMode}
          onChange={(e) => setTask({ ...task, title: e.target.value })}
        />
        <TextField
          label="Descrição"
          variant="outlined"
          fullWidth
          margin="normal"
          value={task.description}
          disabled={!isEditMode}
          onChange={(e) => setTask({ ...task, description: e.target.value })}
        />
        {/*
        Detalhe importante: usamos o valor da task original pois o valor da task atual pode ter sido alterado pelo usuário, mas ainda não foi salvo no banco de dados, então a regra de negócio pode ser violada
        */}
        <TransitionForm disabled={!isEditMode} originalStatus={originalTask.status} originalTask={originalTask} onStatusChange={handleStatusChange} />


        <FormControlLabel
          control={<Checkbox checked={task.isPrivate} disabled={!isEditMode} onChange={(e) =>
            setTask({ ...task, isPrivate: e.target.checked })}
          />}
          label="Tarefa privada?"
        />

        {!isEditMode ?
          <Button
            sx={{ my: '1rem' }}
            variant="contained"
            fullWidth
            onClick={handleEditClick}
            disabled={Meteor.userId() !== task.userId}>
            Editar
          </Button>
          :
          <Button
            sx={{ my: '1rem' }}
            variant="outlined"
            fullWidth
            onClick={handleCancelClick}
            disabled={Meteor.userId() !== task.userId}
          >
            Cancelar
          </Button>
        }

        {isEditMode && (
          <Button sx={{ my: '1rem' }} type="submit" fullWidth variant="contained">
            Atualizar
          </Button>
        )}
      </form>
      {feedback && <Container maxWidth="sm" >
        <ErrorDisplay message={feedback} severity='success' />
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={{ my: '1rem' }}
        >
          <Button variant="outlined" color="primary" onClick={handleGoBack} startIcon={<ArrowBackIcon />}>
            Voltar
          </Button>
        </Box>
      </Container>
      }
    </Container>
  );
}


const TransitionForm = ({ originalTask, onStatusChange, disabled }) => {
  //Como poderiamos lidar com essa restrição de transição de status?
  const [selectedStatus, setSelectedStatus] = useState(originalTask.status);
  console.log("Status selecionado: ", selectedStatus)

  const handleRadioChange = (event) => {
    setSelectedStatus(event.target.value);
    onStatusChange(event.target.value);
  };

  const determineAllowedStatuses = (status) => {
    switch (status) {
      case taskStatuses.CADASTRADA:
        return [true, true, false];

      case taskStatuses.EM_ANDAMENTO:
        return [true, true, true];

      case taskStatuses.CONCLUIDA:
        return [true, false, true];
      default:
        console.error("Status inválido: ", status)
        return [true, false, false];
    }
  }

  const [allowedStatuses, setAllowedStatuses] = useState(determineAllowedStatuses(originalTask.status));

  useEffect(() => {
    setAllowedStatuses(determineAllowedStatuses(originalTask.status));
    console.log("Status original: ", originalTask, "e allowedStatuses: ", )
    console.log("Status no objeto: ", originalTask.status)
    setSelectedStatus(originalTask.status);
  }, [originalTask]);

  //necessário para resetar o form
  useEffect(() => {
    setSelectedStatus(originalTask.status);
  }, [disabled]);

  return (
    <FormControl component="fieldset">
      <RadioGroup value={selectedStatus} onChange={handleRadioChange}>
        <FormControlLabel
          value={taskStatuses.CADASTRADA}
          control={<Radio />}
          label={taskStatuses.CADASTRADA}
          disabled={disabled || !allowedStatuses[0]}
        />
        <FormControlLabel
          value={taskStatuses.EM_ANDAMENTO}
          control={<Radio />}
          label={taskStatuses.EM_ANDAMENTO}
          disabled={disabled || !allowedStatuses[1]}
        />
        <FormControlLabel
          value={taskStatuses.CONCLUIDA}
          control={<Radio />}
          label={taskStatuses.CONCLUIDA}
          disabled={disabled || !allowedStatuses[2]}
        />
      </RadioGroup>
    </FormControl>
  );
};

const TaskInfo = ({ task }) => {

  const formatRelativeTime = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pt });
  };

  return (
    <Box>
      <Typography>Tarefa criada {formatRelativeTime(task.createdAt)}</Typography>
      {task.updatedAt && <Typography>Atualizada pela última vez {formatRelativeTime(task.updatedAt)}</Typography>}
    </Box>
  );
};


export default TaskViewEdit;
